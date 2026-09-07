import type { Pool } from "pg";
import { withEvent } from "@albora/db";

/**
 * Lista quem está pronto para receber a entrega das fotos: contatos de
 * e-mail verificados que ainda não foram entregues, e só depois que o
 * casal abriu o gate (`events.delivery_opens_at`). Gate NULL ou no futuro
 * é `[]` — quem dispara o job de entrega decide o "quando", não este
 * resolvedor.
 */
export async function resolveDeliveries(
  pool: Pool,
  eventId: string,
  now: Date = new Date(),
): Promise<{ sessionId: string; email: string }[]> {
  return withEvent(pool, eventId, async (cliente) => {
    const { rows: ev } = await cliente.query<{ delivery_opens_at: Date | null }>(
      "SELECT delivery_opens_at FROM events WHERE id = $1",
      [eventId],
    );
    const abre = ev[0]?.delivery_opens_at ?? null;
    if (!abre || abre.getTime() > now.getTime()) return [];

    const { rows } = await cliente.query<{ session_id: string; value: string }>(
      `SELECT session_id, value FROM guest_contacts
        WHERE event_id = $1 AND channel = 'email'
          AND verified_at IS NOT NULL AND delivered_at IS NULL`,
      [eventId],
    );
    return rows.map((r) => ({ sessionId: r.session_id, email: r.value }));
  });
}
