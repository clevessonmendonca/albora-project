import type { Actor } from "@albora/core";
import type { EventDetailAdmin } from "@albora/db";
import { getEventDetailAdmin } from "@albora/db";
import type { Pool } from "pg";
import { withPlatformAggregation } from "../platform/aggregation";

export type { EventDetailAdmin } from "@albora/db";

export type GetEventInput = { actor: Actor; reason: string; eventId: string };

/** Único caso de uso da tela Evento — detalhe (§8.1.4): funil e consentimento agregados, sob `withPlatformAggregation`. */
export async function getEvent(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: GetEventInput,
): Promise<EventDetailAdmin | null> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "events.read",
    reason: input.reason,
    action: "events.detail.read",
    run: () => getEventDetailAdmin(deps.aggregatorPool, input.eventId),
  });
}
