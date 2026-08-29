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

export interface SetupTestEventOptions {
  slug?: string;
  packId?: string;
  socialGateOpenAt?: Date;
  coupleNames?: {
    couple1: string;
    couple2: string;
  };
}

export interface TestEvent {
  id: string;
  slug: string;
  packId: string;
  socialGateOpenAt: Date | null;
  couple1Name: string;
  couple2Name: string;
  createdAt: Date;
}

export type TestUpload = {
  id: string;
  event_id: string;
  key: string;
  mime: string;
  mission: string | null;
  status: string;
  created_at: Date;
};

export async function setupTestEvent(
  options: SetupTestEventOptions = {},
): Promise<TestEvent> {
  const timestamp = Date.now();
  const slug = options.slug || `test-event-${timestamp}`;
  const packId = options.packId || "wedding-modern";
  const socialGateOpenAt = options.socialGateOpenAt || new Date();
  const couple1Name = options.coupleNames?.couple1 || "João";
  const couple2Name = options.coupleNames?.couple2 || "Maria";

  const client = await getE2ePool().connect();
  try {
    await client.query("BEGIN");
    const res = await client.query<{
      id: string;
      slug: string;
      pack_id: string;
      social_gate_open_at: Date | null;
      couple1_name: string;
      couple2_name: string;
      created_at: Date;
    }>(
      `
      INSERT INTO events (
        slug,
        pack_id,
        social_gate_open_at,
        couple1_name,
        couple2_name,
        couple_email,
        vendor_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        slug,
        pack_id,
        social_gate_open_at,
        couple1_name,
        couple2_name,
        created_at
    `,
      [
        slug,
        packId,
        socialGateOpenAt,
        couple1Name,
        couple2Name,
        `test-${timestamp}@albora.test`,
        null,
      ],
    );

    const row = res.rows[0];
    if (!row) throw new Error("falha ao criar evento de teste");
    await client.query("COMMIT");
    return {
      id: row.id,
      slug: row.slug,
      packId: row.pack_id,
      socialGateOpenAt: row.social_gate_open_at,
      couple1Name: row.couple1_name,
      couple2Name: row.couple2_name,
      createdAt: row.created_at,
    };
  } catch (erro) {
    await client.query("ROLLBACK").catch(() => {});
    throw erro;
  } finally {
    client.release();
  }
}

export async function getEventUploads(eventId: string): Promise<TestUpload[]> {
  return comEvento(getE2ePool(), eventId, async (client) => {
    const result = await client.query<TestUpload>(
      `
      SELECT
        id,
        event_id,
        key,
        mime,
        mission,
        status,
        created_at
      FROM uploads
      WHERE event_id = $1
      ORDER BY created_at DESC
    `,
      [eventId],
    );

    return result.rows;
  });
}

export async function getEventBySlug(slug: string): Promise<TestEvent | null> {
  const client = await getE2ePool().connect();
  try {
    const result = await client.query<{
      id: string;
      slug: string;
      pack_id: string;
      social_gate_open_at: Date | null;
      couple1_name: string;
      couple2_name: string;
      created_at: Date;
    }>(
      `
      SELECT
        id,
        slug,
        pack_id,
        social_gate_open_at,
        couple1_name,
        couple2_name,
        created_at
      FROM events
      WHERE slug = $1
    `,
      [slug],
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      slug: row.slug,
      packId: row.pack_id,
      socialGateOpenAt: row.social_gate_open_at,
      couple1Name: row.couple1_name,
      couple2Name: row.couple2_name,
      createdAt: row.created_at,
    };
  } finally {
    client.release();
  }
}
