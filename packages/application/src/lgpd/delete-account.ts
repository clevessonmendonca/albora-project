import type { Pool } from "pg";
import type { Actor, DriveTokenVault } from "@albora/core";
import { purgeAccountDataOnClient, type AccountPurgeResult } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type DeleteAccountInput = { actor: Actor; reason: string; accountId: string };

/**
 * `lgpd.delete_account` sempre `needsReauth` (`POLICIES`, Onda A) — a
 * própria política do envelope, não uma checagem daqui, é o que garante o
 * step-up mesmo para `owner`: papel dá capacidade, política dá
 * circunstância.
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
 */
export async function deleteAccountOnRequest(
  deps: { pool: Pool; vault?: DriveTokenVault },
  input: DeleteAccountInput,
): Promise<AccountPurgeResult> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "lgpd.delete_account",
    reason: input.reason,
    target: { kind: "account", id: input.accountId },
    action: "lgpd.delete_account",
    run: (tx) => purgeAccountDataOnClient(tx, input.accountId, deps.vault ? { vault: deps.vault } : {}),
  });
}
