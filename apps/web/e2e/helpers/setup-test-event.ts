/**
 * Helper para criar eventos de teste no banco de dados
 *
 * Uso:
 * ```typescript
 * const event = await setupTestEvent({
 *   slug: 'casamento-joao-maria',
 *   packId: 'wedding-modern',
 * });
 * ```
 */

import { comEvento } from "@albora/db";
import { getPool, getAggregatorPool } from "@/lib/db";

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

/**
 * Cria um evento de teste no banco de dados
 */
export async function setupTestEvent(
  options: SetupTestEventOptions = {}
): Promise<TestEvent> {
  // Gera valores padrão
  const timestamp = Date.now();
  const slug = options.slug || `test-event-${timestamp}`;
  const packId = options.packId || "wedding-modern";
  const socialGateOpenAt = options.socialGateOpenAt || new Date();
  const couple1Name = options.coupleNames?.couple1 || "João";
  const couple2Name = options.coupleNames?.couple2 || "Maria";

  // Cria o evento — ainda não existe event_id para escopar RLS, usa o papel BYPASSRLS
  const res = await getAggregatorPool().query(
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
      null, // vendor_id (não obrigatório)
    ]
  );

  return {
    id: res.rows[0].id,
    slug: res.rows[0].slug,
    packId: res.rows[0].pack_id,
    socialGateOpenAt: res.rows[0].social_gate_open_at,
    couple1Name: res.rows[0].couple1_name,
    couple2Name: res.rows[0].couple2_name,
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
        key,
        mime,
        mission,
        status,
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
  // Busca sem event_id — cruza eventos, usa o papel BYPASSRLS
  const result = await getAggregatorPool().query(
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
    [slug]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    id: result.rows[0].id,
    slug: result.rows[0].slug,
    packId: result.rows[0].pack_id,
    socialGateOpenAt: result.rows[0].social_gate_open_at,
    couple1Name: result.rows[0].couple1_name,
    couple2Name: result.rows[0].couple2_name,
    createdAt: result.rows[0].created_at,
  };
}
