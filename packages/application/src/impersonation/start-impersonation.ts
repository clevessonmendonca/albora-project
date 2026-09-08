import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import {
  getImpersonationRequestById,
  issueMarkedHostSession,
  startImpersonationRequestOnClient,
  type ImpersonationRequestRow,
} from "@albora/db";
import { executeCommand } from "../envelope/command";
import { CommandDeniedError } from "../envelope/errors";

export type StartImpersonationInput = { actor: Actor; reason: string; requestId: string };
export type StartImpersonationResult = { request: ImpersonationRequestRow; hostToken: string };

/**
 * O comando que ATIVA a sessão — RULING desta task. A exigência de
 * aprovação é invariante de negócio AQUI DENTRO, não em `impersonate.request`:
 * `startImpersonationRequestOnClient` só transiciona `approved -> active`
 * quando `expires_at` ainda está no futuro, na mesma UPDATE (uso único —
 * ver o db layer). Só quem pediu a impersonação pode iniciar a própria
 * janela aprovada; outro staff com `impersonate.request` não assume o
 * pedido de outro (isso não é o que a política de capacidade cobre).
 *
 * Emite a `host_sessions` marcada (`impersonation_id`) NA MESMA transação
 * do comando — se a auditoria ou a emissão falharem, o pedido continua
 * `approved`, nunca `active` sem sessão correspondente.
 */
export async function startImpersonation(
  deps: { pool: Pool; sessionSecret: string },
  input: StartImpersonationInput,
): Promise<StartImpersonationResult> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "impersonate.request",
    reason: input.reason,
    target: { kind: "impersonation_request", id: input.requestId },
    action: "impersonate.start",
    run: async (tx) => {
      const atual = await getImpersonationRequestById(tx, input.requestId);
      if (!atual) throw new Error(`pedido de impersonação ${input.requestId} não encontrado`);
      if (atual.requesterStaffId !== input.actor.staffUserId) {
        throw new CommandDeniedError("impersonate.request", "só quem pediu pode iniciar esta sessão");
      }

      const request = await startImpersonationRequestOnClient(tx, { id: input.requestId });
      const { token } = await issueMarkedHostSession(
        tx,
        deps.sessionSecret,
        request.targetAccountId,
        request.id,
        request.expiresAt!,
      );
      return { request, hostToken: token };
    },
  });
}
