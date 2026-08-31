/**
 * Helper para limpar dados de teste do banco de dados
 *
 * Uso:
 * ```typescript
 * await cleanupTestEvent(event.id);
 * ```
 */

import { comEvento } from "@albora/db";
import { getPool, getAggregatorPool } from "@/lib/db";

/**
 * Remove um evento de teste e todos os dados relacionados
 *
 * Ordem de deleção respeitando foreign keys:
 * 1. Reações
 * 2. Comentários
 * 3. Uploads
 * 4. Sessões
 * 5. Missões customizadas
 * 6. Stories
 * 7. Eventos
 */
export async function cleanupTestEvent(eventId: string): Promise<void> {
  await comEvento(getPool(), eventId, async (client) => {
    // 1. Reações (FK → uploads)
    await client.query("DELETE FROM reactions WHERE event_id = $1", [eventId]);

    // 2. Comentários (FK → uploads)
    await client.query("DELETE FROM comments WHERE event_id = $1", [eventId]);

    // 3. Uploads (FK → events)
    await client.query("DELETE FROM uploads WHERE event_id = $1", [eventId]);

    // 4. Sessões (FK → events)
    await client.query("DELETE FROM guest_sessions WHERE event_id = $1", [
      eventId,
    ]);
    await client.query("DELETE FROM host_sessions WHERE event_id = $1", [
      eventId,
    ]);

    // 5. Missões customizadas (FK → events)
    await client.query("DELETE FROM custom_missions WHERE event_id = $1", [
      eventId,
    ]);

    // 6. Stories (FK → events)
    await client.query("DELETE FROM stories WHERE event_id = $1", [eventId]);

    // 7. Guestbook (FK → events)
    await client.query("DELETE FROM guestbooks WHERE event_id = $1", [eventId]);

    // 8. Music suggestions (FK → events)
    await client.query("DELETE FROM music_suggestions WHERE event_id = $1", [
      eventId,
    ]);

    // 9. Drive exports (FK → events)
    await client.query("DELETE FROM drive_exports WHERE event_id = $1", [
      eventId,
    ]);

    // 10. Export jobs (FK → events)
    await client.query("DELETE FROM export_jobs WHERE event_id = $1", [
      eventId,
    ]);

    // 11. Wall pairings (FK → events)
    await client.query("DELETE FROM wall_pairings WHERE event_id = $1", [
      eventId,
    ]);

    // 12. Evento principal
    await client.query("DELETE FROM events WHERE id = $1", [eventId]);
  });
}

/**
 * Remove múltiplos eventos de teste
 */
export async function cleanupMultipleTestEvents(
  eventIds: string[]
): Promise<void> {
  for (const eventId of eventIds) {
    await cleanupTestEvent(eventId);
  }
}

/**
 * Remove TODOS os eventos de teste (começando com 'test-event-')
 *
 * ⚠️ USE COM CUIDADO! Só em ambiente de teste!
 */
export async function cleanupAllTestEvents(): Promise<void> {
  const result = await getAggregatorPool().query(
    "SELECT id FROM events WHERE slug LIKE 'test-event-%'"
  );

  const eventIds: string[] = result.rows.map((row) => row.id);

  for (const eventId of eventIds) {
    await cleanupTestEvent(eventId);
  }
}

