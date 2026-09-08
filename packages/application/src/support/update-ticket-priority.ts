import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { updateSupportTicketPriorityOnClient, type SupportPriority } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type UpdateTicketPriorityInput = { actor: Actor; ticketId: string; priority: SupportPriority };

export async function updateTicketPriority(deps: { pool: Pool }, input: UpdateTicketPriorityInput): Promise<void> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "tickets.write",
    reason: `mudar prioridade do ticket ${input.ticketId} para ${input.priority}`,
    target: { kind: "ticket", id: input.ticketId },
    action: "tickets.priority.change",
    metadata: { priority: input.priority },
    run: (tx) => updateSupportTicketPriorityOnClient(tx, { ticketId: input.ticketId, priority: input.priority }),
  });
}
