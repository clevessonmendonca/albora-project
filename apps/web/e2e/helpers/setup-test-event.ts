/**
 * Helper para criar eventos de teste no banco de dados
 *
 * Uso:
 * ```typescript
 * const event = await setupTestEvent({
 *   slug: 'test-event-123',
 *   packId: 'casamento',
 * });
 * ```
 */

import { comEvento } from "@albora/db";
import { getPool, getAggregatorPool } from "@/lib/db";

export interface SetupTestEventOptions {
  slug?: string;
  packId?: string;
  interactionOpensAt?: Date;
}

export interface TestEvent {
  id: string;
  slug: string;
  packId: string;
  accountId: string;
  interactionOpensAt: Date | null;
  createdAt: Date;
}

/**
 * Cria um evento de teste no banco de dados.
 *
 * Cria a conta dona do evento junto — o FK é NOT NULL.
 */
export async function setupTestEvent(
  options: SetupTestEventOptions = {}
): Promise<TestEvent> {
  const timestamp = Date.now();
  const slug = options.slug || `test-event-${timestamp}`;
  const packId = options.packId || "casamento";
  const interactionOpensAt = options.interactionOpensAt || new Date();

  const pool = getAggregatorPool();

  const acct = await pool.query(
    `INSERT INTO accounts (email) VALUES ($1) RETURNING id`,
    [`test-${timestamp}@albora.test`]
  );
  const accountId: string = acct.rows[0].id;

  const res = await pool.query(
    `
      INSERT INTO events (
        account_id,
        slug,
        pack_id,
        starts_at,
        ends_at,
        interaction_opens_at
      )
      VALUES ($1, $2, $3, NOW(), NOW() + interval '6 hours', $4)
      RETURNING
        id,
        slug,
        pack_id,
        account_id,
        interaction_opens_at,
        created_at
    `,
    [accountId, slug, packId, interactionOpensAt]
  );

  const eventoId = res.rows[0].id;
  await pool.query(
    "INSERT INTO event_slugs (slug, event_id) VALUES ($1, $2)",
    [slug, eventoId]
  );

  return {
    id: res.rows[0].id,
    slug: res.rows[0].slug,
    packId: res.rows[0].pack_id,
    accountId: res.rows[0].account_id,
    interactionOpensAt: res.rows[0].interaction_opens_at,
    createdAt: res.rows[0].created_at,
  };
}

/**
 * Busca uploads de um evento de teste
 */
export async function getEventUploads(eventId: string) {
  return await comEvento(getPool(), eventId, async (client) => {
    const result = await client.query(
      `
      SELECT
        id,
        event_id,
        storage_key,
        mime,
        challenge_id,
        state,
        created_at
      FROM uploads
      WHERE event_id = $1
      ORDER BY created_at DESC
    `,
      [eventId]
    );

    return result.rows;
  });
}

/**
 * Busca um evento de teste pelo slug
 */
export async function getEventBySlug(slug: string): Promise<TestEvent | null> {
  const result = await getAggregatorPool().query(
    `
      SELECT
        id,
        slug,
        pack_id,
        account_id,
        interaction_opens_at,
        created_at
      FROM events
      WHERE slug = $1
    `,
    [slug]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    id: result.rows[0].id,
    slug: result.rows[0].slug,
    packId: result.rows[0].pack_id,
    accountId: result.rows[0].account_id,
    interactionOpensAt: result.rows[0].interaction_opens_at,
    createdAt: result.rows[0].created_at,
  };
}
