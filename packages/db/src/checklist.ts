import type { PoolClient } from "pg";

export async function lerChecklist(cliente: PoolClient, eventoId: string): Promise<string[]> {
  const { rows } = await cliente.query<{ item_key: string }>(
    `SELECT item_key FROM event_checklist WHERE event_id = $1 ORDER BY item_key`,
    [eventoId],
  );
  return rows.map((l) => l.item_key);
}

export async function marcarItemChecklist(
  cliente: PoolClient,
  eventoId: string,
  itemKey: string,
  accountId: string | null,
): Promise<void> {
  await cliente.query(
    `INSERT INTO event_checklist (event_id, item_key, done_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id, item_key) DO NOTHING`,
    [eventoId, itemKey, accountId],
  );
}

export async function desmarcarItemChecklist(
  cliente: PoolClient,
  eventoId: string,
  itemKey: string,
): Promise<void> {
  await cliente.query(`DELETE FROM event_checklist WHERE event_id = $1 AND item_key = $2`, [
    eventoId,
    itemKey,
  ]);
}
