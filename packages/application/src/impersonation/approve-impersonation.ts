import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { approveImpersonationRequestOnClient, IMPERSONATION_TTL_MINUTES, type ImpersonationRequestRow } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type ApproveImpersonationInput = { actor: Actor; reason: string; requestId: string };

/**
 * `impersonate.approve` não tem política própria — `hasCapability` decide,
 * e só `owner` tem essa capacidade (`roles.ts`). Aprovar move
 * `pending -> approved` e grava o TTL fixo (`IMPERSONATION_TTL_MINUTES`,
 * spec §11) a partir de AGORA — não ativa a sessão sozinho: quem ativa é
 * `startImpersonation`, separado, porque aprovar e efetivamente entrar na
 * conta podem ser momentos distintos.
 */
export async function approveImpersonation(
  deps: { pool: Pool },
  input: ApproveImpersonationInput,
): Promise<ImpersonationRequestRow> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "impersonate.approve",
    reason: input.reason,
    target: { kind: "impersonation_request", id: input.requestId },
    action: "impersonate.approve",
    run: (tx) =>
      approveImpersonationRequestOnClient(tx, {
        id: input.requestId,
        approverStaffId: input.actor.staffUserId,
        ttlMinutes: IMPERSONATION_TTL_MINUTES,
      }),
  });
}
