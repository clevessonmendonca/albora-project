import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { endImpersonationRequestOnClient, getImpersonationRequestById, type ImpersonationRequestRow } from "@albora/db";
import { executeCommand } from "../envelope/command";
import { CommandDeniedError } from "../envelope/errors";

export type EndImpersonationInput = { actor: Actor; reason: string; requestId: string };

/**
 * Encerramento explícito (spec §11) — nunca deixa a janela fechar sozinha
 * só porque o TTL bateu. Só quem pediu OU quem aprovou pode encerrar,
 * nunca um terceiro staff: `endImpersonationRequestOnClient` já revoga a
 * `host_sessions` marcada NA MESMA transação, então uma restrição de
 * autoria aqui é o que impede qualquer support agent encerrar a sessão de
 * outro (e, de quebra, revogar o acesso de outro colega sem contexto).
 */
export async function endImpersonation(
  deps: { pool: Pool },
  input: EndImpersonationInput,
): Promise<ImpersonationRequestRow> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "impersonate.request",
    reason: input.reason,
    target: { kind: "impersonation_request", id: input.requestId },
    action: "impersonate.end",
    run: async (tx) => {
      const atual = await getImpersonationRequestById(tx, input.requestId);
      if (!atual) throw new Error(`pedido de impersonação ${input.requestId} não encontrado`);
      const podeEncerrar =
        atual.requesterStaffId === input.actor.staffUserId || atual.approverStaffId === input.actor.staffUserId;
      if (!podeEncerrar) {
        throw new CommandDeniedError("impersonate.request", "só quem pediu ou aprovou pode encerrar esta sessão");
      }
      return endImpersonationRequestOnClient(tx, { id: input.requestId });
    },
  });
}
