import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { respondSupportTicketOnClient, type SupportMessageRow } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type RespondTicketInput = { actor: Actor; ticketId: string; body: string };

/** `reason` de executeCommand é preenchido automaticamente aqui — a resposta em si já é o registro substantivo; o operador não digita um "motivo" pra responder um ticket. */
export async function respondTicket(deps: { pool: Pool }, input: RespondTicketInput): Promise<SupportMessageRow> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "tickets.write",
    reason: `responder ticket ${input.ticketId}`,
    target: { kind: "ticket", id: input.ticketId },
    action: "tickets.respond",
    metadata: { bodyLength: input.body.length },
    run: (tx) => respondSupportTicketOnClient(tx, { ticketId: input.ticketId, staffId: input.actor.staffUserId, body: input.body }),
  });
}
