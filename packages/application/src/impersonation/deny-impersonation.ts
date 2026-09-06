import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { denyImpersonationRequestOnClient, type ImpersonationRequestRow } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type DenyImpersonationInput = { actor: Actor; reason: string; requestId: string };

/** Mesma capacidade de `approveImpersonation` (`impersonate.approve`) — negar é a outra saída do mesmo pedido pendente. */
export async function denyImpersonation(
  deps: { pool: Pool },
  input: DenyImpersonationInput,
): Promise<ImpersonationRequestRow> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "impersonate.approve",
    reason: input.reason,
    target: { kind: "impersonation_request", id: input.requestId },
    action: "impersonate.deny",
    run: (tx) => denyImpersonationRequestOnClient(tx, { id: input.requestId, approverStaffId: input.actor.staffUserId }),
  });
}
