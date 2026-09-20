import { comEvento } from "@albora/db";
import { getPool, getAggregatorPool } from "@/lib/db";

export async function cleanupTestEvent(eventId: string): Promise<void> {
  await comEvento(getPool(), eventId, async (client) => {
    await client.query("DELETE FROM reactions WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM comments WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM recado_lido WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM recado WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM story WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM uploads WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM guest_sessions WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM music_suggestions WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM export_jobs WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM drive_connections WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM wall_pairings WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM challenges WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM event_slugs WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM events WHERE id = $1", [eventId]);
  });
}

export async function cleanupMultipleTestEvents(
  eventIds: string[]
): Promise<void> {
  for (const eventId of eventIds) {
    await cleanupTestEvent(eventId);
  }
}

export async function cleanupAllTestEvents(): Promise<void> {
  const result = await getAggregatorPool().query(
    "SELECT id FROM events WHERE slug LIKE 'test-event-%'"
  );

  const eventIds: string[] = result.rows.map((row) => row.id);

  for (const eventId of eventIds) {
    await cleanupTestEvent(eventId);
  }
}
