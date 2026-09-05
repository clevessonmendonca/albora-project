import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { assignSupportTicketOnClient } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type AssignTicketInput = { actor: Actor; ticketId: string; assigneeStaffId: string | null };

export async function assignTicket(deps: { pool: Pool }, input: AssignTicketInput): Promise<void> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "tickets.assign",
    reason: input.assigneeStaffId
      ? `atribuir ticket ${input.ticketId} a ${input.assigneeStaffId}`
      : `desatribuir ticket ${input.ticketId}`,
    target: { kind: "ticket", id: input.ticketId },
    action: "tickets.assign",
    metadata: { assigneeStaffId: input.assigneeStaffId },
    run: (tx) => assignSupportTicketOnClient(tx, { ticketId: input.ticketId, staffId: input.assigneeStaffId }),
  });
}
