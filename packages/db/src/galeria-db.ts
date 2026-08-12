import type { PoolClient } from "pg";

export type MidiaMinha = {
  id: string;
  chaveFull: string;
  chaveThumb: string;
  criadaEm: Date;
};

/**
 * Fotos confirmadas desta sessão no evento (spec 008).
 *
 * Inclui o que a moderação escondeu do feed alheio: a galeria pessoal responde
 * "chegou?", não "está público?". Só some o que a própria sessão removeu.
 */
export async function listarMinhasDoEvento(
  cliente: PoolClient,
  sessaoId: string,
): Promise<MidiaMinha[]> {
  const { rows } = await cliente.query<{
    id: string;
    storage_key: string;
    created_at: Date;
  }>(
    `SELECT id, storage_key, created_at
       FROM uploads
      WHERE session_id = $1 AND state <> 'removed'
      ORDER BY created_at DESC`,
    [sessaoId],
  );

  return rows.map((l) => ({
    id: l.id,
    chaveFull: l.storage_key,
    chaveThumb: chaveDaMiniatura(l.storage_key),
    criadaEm: l.created_at,
  }));
}

function chaveDaMiniatura(chaveFull: string): string {
  return chaveFull.endsWith("/full") ? `${chaveFull.slice(0, -"/full".length)}/thumb` : chaveFull;
}
