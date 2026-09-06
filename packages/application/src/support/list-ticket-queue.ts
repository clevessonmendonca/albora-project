import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listSupportTicketsQueueAdmin, type SupportTicketAdmin } from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";

export type ListTicketQueueInput = {
  actor: Actor;
  reason: string;
  statuses?: ("open" | "pending" | "resolved" | "closed")[];
  assigneeStaffId?: string;
  limit: number;
};

export async function listTicketQueue(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: ListTicketQueueInput,
): Promise<{ rows: SupportTicketAdmin[] }> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "tickets.read",
    reason: input.reason,
    action: "tickets.queue.read",
    run: () =>
      listSupportTicketsQueueAdmin(deps.aggregatorPool, {
        ...(input.statuses ? { statuses: input.statuses } : {}),
        ...(input.assigneeStaffId ? { assigneeStaffId: input.assigneeStaffId } : {}),
        limit: input.limit,
      }),
  });
}
