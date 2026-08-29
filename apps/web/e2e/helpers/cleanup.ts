import { Pool } from "pg";
import { comEvento } from "@albora/db";

let pool: Pool | null = null;

function getE2ePool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL é obrigatório para e2e");
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

export async function cleanupTestEvent(eventId: string): Promise<void> {
  await comEvento(getE2ePool(), eventId, async (client) => {
    await client.query("DELETE FROM reactions WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM comments WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM uploads WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM guest_sessions WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM host_sessions WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM custom_missions WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM stories WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM guestbooks WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM music_suggestions WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM drive_exports WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM export_jobs WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM wall_pairings WHERE event_id = $1", [eventId]);
    await client.query("DELETE FROM events WHERE id = $1", [eventId]);
  });
}

export async function cleanupMultipleTestEvents(eventIds: string[]): Promise<void> {
  for (const eventId of eventIds) {
    await cleanupTestEvent(eventId);
  }
}

export async function cleanupAllTestEvents(): Promise<void> {
  const client = await getE2ePool().connect();
  try {
    const result = await client.query<{ id: string }>(
      "SELECT id FROM events WHERE slug LIKE 'test-event-%'",
    );

    for (const row of result.rows) {
      await cleanupTestEvent(row.id);
    }
  } finally {
    client.release();
  }
}
