import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { updateSupportTicketStatusOnClient, type SupportStatus } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type UpdateTicketStatusInput = { actor: Actor; ticketId: string; status: SupportStatus };

export async function updateTicketStatus(deps: { pool: Pool }, input: UpdateTicketStatusInput): Promise<void> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "tickets.write",
    reason: `mudar status do ticket ${input.ticketId} para ${input.status}`,
    target: { kind: "ticket", id: input.ticketId },
    action: "tickets.status.change",
    metadata: { status: input.status },
    run: (tx) => updateSupportTicketStatusOnClient(tx, { ticketId: input.ticketId, status: input.status }),
  });
}
