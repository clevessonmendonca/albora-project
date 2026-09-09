import type { Actor } from "@albora/core";
import type { EventAdminRow } from "@albora/db";
import { listEventsAdmin } from "@albora/db";
import type { Pool } from "pg";
import { withPlatformAggregation } from "../platform/aggregation";

export type ListLiveEventsInput = { actor: Actor; reason: string; limit: number; now?: Date };

/**
 * "Acontecendo agora" da Visão geral (§4.2).
 *
 * `listEvents({ status: "active" })` **não** responde essa pergunta: `status`
 * é ciclo de vida — vira `active` no publicar e fica assim dias antes da
 * festa. A janela real é `starts_at` no passado com `ends_at` ainda dentro
 * da carência, o mesmo predicado que o cron de snapshot já usava.
 */
export async function listLiveEvents(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: ListLiveEventsInput,
): Promise<{ rows: EventAdminRow[] }> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "events.read",
    reason: input.reason,
    action: "events.live.read",
    run: async () => {
      const { rows } = await listEventsAdmin(deps.aggregatorPool, {
        aoVivoEm: input.now ?? new Date(),
        limit: input.limit,
      });
      return { rows };
    },
  });
}
