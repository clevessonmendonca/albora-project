import type { PoolClient } from "pg";

function fullKeyFromAny(key: string): string {
  return key.endsWith("/thumb") ? `${key.slice(0, -"/thumb".length)}/full` : key;
}

/** Ausência de upload e remoção são intencionalmente indistinguíveis — chave fora do conjunto é inválida sem revelar qual condição disparou o bloqueio. */
export async function signableKeys(
  cliente: PoolClient,
  eventoId: string,
  storageKeys: readonly string[],
): Promise<Set<string>> {
  if (storageKeys.length === 0) return new Set();

  // 🔴 Pânico bloqueia qualquer nova emissão no evento, sem consultar uploads.
  const { rows: eRows } = await cliente.query<{ panic: boolean }>(
    "SELECT panic FROM events WHERE id = $1",
    [eventoId],
  );
  if (eRows[0]?.panic) return new Set();

  const fullKeys = storageKeys.map(fullKeyFromAny);

  const { rows } = await cliente.query<{ storage_key: string }>(
    `SELECT storage_key FROM uploads
     WHERE event_id = $1 AND storage_key = ANY($2) AND state = 'published'`,
    [eventoId, fullKeys],
  );
  const publishedFullKeys = new Set(rows.map((r) => r.storage_key));

  const result = new Set<string>();
  for (const original of storageKeys) {
    if (publishedFullKeys.has(fullKeyFromAny(original))) {
      result.add(original);
    }
  }
  return result;
}
