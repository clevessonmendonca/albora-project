import type { Pool } from "pg";
import type { Actor, DriveTokenVault } from "@albora/core";
import {
  enqueueAccountPurge,
  getDsarRequestOnClient,
  markAccountPurgeKey,
  purgeAccountDataOnClient,
  type AccountPurgeMarkResult,
  type AccountPurgeResult,
} from "@albora/db";
import { executeCommand } from "../envelope/command";
import { CommandDeniedError } from "../envelope/errors";

export type DeleteAccountInput = { actor: Actor; reason: string; accountId: string; dsarRequestId: string };

export type DeleteAccountResult = AccountPurgeResult & { purgeJobIds: string[] };

/**
 * `lgpd.delete_account` sempre `needsReauth` (`POLICIES`, Onda A) — a
 * própria política do envelope, não uma checagem daqui, é o que garante o
 * step-up mesmo para `owner`: papel dá capacidade, política dá
 * circunstância.
 *
 * A purga só roda contra um pedido de exclusão já aberto — "excluir conta"
 * nunca apaga direto, sempre executa um DSAR `kind = 'deletion'` (RULING da
 * task fix/excluir-conta-abre-dsar). `getDsarRequestOnClient` tranca a linha
 * (`FOR UPDATE`) dentro da MESMA tx antes de decidir: se o pedido não existe,
 * é de outro tipo, é de outra conta, ou já foi concluído/recusado, nada é
 * apagado — `CommandDeniedError` sobe e `executeCommand` faz ROLLBACK antes
 * de tocar em `purgeAccountDataOnClient`.
 *
 * Fail-closed: `purgeAccountDataOnClient` roda inteiro dentro da MESMA
 * transação que `executeCommand` já abriu. Se qualquer DELETE dela
 * estourar (FK não prevista, RLS bloqueando uma linha), a exceção sobe,
 * `executeCommand` faz ROLLBACK, e a conta nunca fica marcada excluída
 * pela metade — nem o `audit_log` é gravado.
 *
 * Bytes no object storage e revogação do refresh token do Drive NÃO
 * acontecem aqui: `AccountPurgeResult` só devolve as chaves e os tokens
 * para o chamador (server action) apagar/revogar depois do COMMIT — o
 * mesmo desenho de enriquecimento pós-commit que `processRetentionJobs`
 * já usa para o d365_delete. Um R2 fora do ar não pode impedir que a
 * conta e os eventos desapareçam do banco.
 *
 * `enqueueAccountPurge` roda DENTRO do mesmo `run(tx)`, gravando cada key de
 * `keysToDelete` como fila `pending` (migration 0066) — se o commit passar,
 * a fila é durável mesmo que o purge de R2 pós-commit nunca rode; se o
 * ROLLBACK disparar, a fila some junto com o resto. Só as keys entram na
 * fila, nunca os tokens do Drive: token é credencial, key é caminho.
 *
 * O pedido NÃO é marcado `completed`: `dsar_requests.subject_account_id` é
 * `ON DELETE CASCADE`, então apagar a conta apaga o pedido junto, na mesma
 * transação. Tentar atualizá-lo depois da purga é um UPDATE em zero linhas.
 * O vínculo entre a purga e o pedido que a autorizou sobrevive em
 * `metadata.dsarRequestId` do `audit_log`, que não tem FK para `accounts` —
 * é ele a prova de atendimento, não a linha do pedido.
 */
export async function deleteAccountOnRequest(
  deps: { pool: Pool; vault?: DriveTokenVault },
  input: DeleteAccountInput,
): Promise<DeleteAccountResult> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "lgpd.delete_account",
    reason: input.reason,
    target: { kind: "account", id: input.accountId },
    action: "lgpd.delete_account",
    metadata: { dsarRequestId: input.dsarRequestId },
    run: async (tx) => {
      const pedido = await getDsarRequestOnClient(tx, input.dsarRequestId);
      if (!pedido || pedido.kind !== "deletion" || pedido.subjectAccountId !== input.accountId) {
        throw new CommandDeniedError(
          "lgpd.delete_account",
          "só é possível excluir a conta a partir de um pedido de exclusão (DSAR) aberto para ela",
        );
      }
      if (pedido.status === "completed" || pedido.status === "refused") {
        throw new CommandDeniedError(
          "lgpd.delete_account",
          `pedido de exclusão já está ${pedido.status === "completed" ? "concluído" : "recusado"}`,
        );
      }

      const purge = await purgeAccountDataOnClient(tx, input.accountId, deps.vault ? { vault: deps.vault } : {});
      const purgeJobIds = await enqueueAccountPurge(tx, input.accountId, purge.keysToDelete);
      return { ...purge, purgeJobIds };
    },
  });
}

/**
 * Wrapper fino sobre `markAccountPurgeKey` (`@albora/db`): marcar uma linha
 * de `account_purge_jobs` como `purged`/`failed` é bookkeeping do purge de
 * R2 pós-commit, não uma nova capacidade de negócio — por isso não passa
 * por `executeCommand` nem grava `audit_log` (mesmo raciocínio do
 * enriquecimento pós-commit de `processRetentionJob`). Existe só para a
 * borda do console (`apps/web/features/console`) marcar o resultado do
 * purge sem importar `@albora/db` diretamente (guard de camadas, ADR 0016).
 */
export async function markAccountPurgeResult(
  pool: Pool,
  jobId: string,
  result: AccountPurgeMarkResult,
): Promise<void> {
  return markAccountPurgeKey(pool, jobId, result);
}
