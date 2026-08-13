import { parsePlanoDoEvento, type PlanoDoEvento } from "@albora/core";
import type { PoolClient } from "pg";

export async function planoDoEvento(c: PoolClient, eventId: string): Promise<PlanoDoEvento> {
  const { rows } = await c.query<{ plan: string }>("SELECT plan FROM events WHERE id = $1", [eventId]);
  return parsePlanoDoEvento(rows[0]?.plan);
}

/** Vídeos já confirmados nesta sessão — base da cota do plano grátis. */
export async function contarVideosDaSessao(
  c: PoolClient,
  eventId: string,
  sessionId: string,
): Promise<number> {
  const { rows } = await c.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
     FROM uploads
     WHERE event_id = $1
       AND session_id = $2
       AND mime LIKE 'video/%'`,
    [eventId, sessionId],
  );
  return Number(rows[0]?.total ?? 0);
}
