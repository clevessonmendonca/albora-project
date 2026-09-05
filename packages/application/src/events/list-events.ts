import type { Actor } from "@albora/core";
import type { EventAdminRow, EventAdminStatus } from "@albora/db";
import { listEventsAdmin } from "@albora/db";
import type { Pool } from "pg";
import { withPlatformAggregation } from "../platform/aggregation";

export type { EventAdminRow, EventAdminStatus } from "@albora/db";

export type ListEventsInput = {
  actor: Actor;
  reason: string;
  status?: EventAdminStatus;
  vendorId?: string;
  search?: string;
  limit: number;
  cursor?: string;
};

/** Único caso de uso da tela Eventos (§8.1.4) — leitura cross-evento sob `withPlatformAggregation`. */
export async function listEvents(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: ListEventsInput,
): Promise<{ rows: EventAdminRow[]; nextCursor: string | null }> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "events.read",
    reason: input.reason,
    action: "events.list.read",
    run: () =>
      listEventsAdmin(deps.aggregatorPool, {
        ...(input.status ? { status: input.status } : {}),
        ...(input.vendorId ? { vendorId: input.vendorId } : {}),
        ...(input.search ? { search: input.search } : {}),
        limit: input.limit,
        ...(input.cursor ? { cursor: input.cursor } : {}),
      }),
  });
}
