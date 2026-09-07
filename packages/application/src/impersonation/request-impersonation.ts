import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { createImpersonationRequestOnClient, type ImpersonationRequestRow } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type RequestImpersonationInput = { actor: Actor; reason: string; targetAccountId: string };

/**
 * `impersonate.request` NÃO tem política própria
 * (`packages/core/src/authorization/policies.ts`) — RULING desta task:
 * criar o pedido é a ação permitida ao suporte, é o ponto inteiro de
 * "suporte pede, dono aprova". A exigência de aprovação vive como
 * invariante DENTRO de `startImpersonation` (o comando que ATIVA a
 * sessão — precisa achar o pedido `approved` e não expirado), não como
 * política que bloqueia a criação. Por isso `executeCommand` cobre esta
 * ação normalmente: nenhuma exceção ao envelope (ADR 0016).
 *
 * `id` gerado aqui, não pelo DEFAULT da coluna: `executeCommand` audita
 * `target.id` decidido antes de abrir a transação, então sem isso o
 * `audit_log` gravaria `target_id = null` para a criação do pedido.
 */
export async function requestImpersonation(
  deps: { pool: Pool },
  input: RequestImpersonationInput,
): Promise<ImpersonationRequestRow> {
  const id = randomUUID();
  return executeCommand(deps, {
    actor: input.actor,
    capability: "impersonate.request",
    reason: input.reason,
    target: { kind: "impersonation_request", id },
    action: "impersonate.request",
    metadata: { targetAccountId: input.targetAccountId },
    run: (tx) =>
      createImpersonationRequestOnClient(tx, {
        id,
        requesterStaffId: input.actor.staffUserId,
        targetAccountId: input.targetAccountId,
        reason: input.reason,
      }),
  });
}
