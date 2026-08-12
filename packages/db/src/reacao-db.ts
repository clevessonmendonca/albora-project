import type { PoolClient } from "pg";

/**
 * Reacao por sessao (spec 008). A PK (upload_id, session_id) garante
 * idempotencia: reagir duas vezes e reagir uma vez.
 */

export async function midiaPublicadaDoEvento(
  cliente: PoolClient,
  eventoId: string,
  uploadId: string,
): Promise<boolean> {
  const { rowCount } = await cliente.query(
    "SELECT 1 FROM uploads WHERE id = $1 AND event_id = $2 AND state = 'published'",
    [uploadId, eventoId],
  );
  return (rowCount ?? 0) > 0;
}

export async function reacaoDaSessao(
  cliente: PoolClient,
  uploadId: string,
  sessaoId: string,
): Promise<string | null> {
  const { rows } = await cliente.query<{ kind: string }>(
    "SELECT kind FROM reactions WHERE upload_id = $1 AND session_id = $2",
    [uploadId, sessaoId],
  );
  return rows[0]?.kind ?? null;
}

export async function gravarReacao(
  cliente: PoolClient,
  eventoId: string,
  uploadId: string,
  sessaoId: string,
  tipo: string,
): Promise<number> {
  await cliente.query(
    `INSERT INTO reactions (event_id, upload_id, session_id, kind)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (upload_id, session_id) DO UPDATE SET kind = EXCLUDED.kind`,
    [eventoId, uploadId, sessaoId, tipo],
  );
  return contarReacoesDaMidia(cliente, uploadId);
}

export async function apagarReacao(
  cliente: PoolClient,
  uploadId: string,
  sessaoId: string,
): Promise<number> {
  await cliente.query("DELETE FROM reactions WHERE upload_id = $1 AND session_id = $2", [
    uploadId,
    sessaoId,
  ]);
  return contarReacoesDaMidia(cliente, uploadId);
}

async function contarReacoesDaMidia(cliente: PoolClient, uploadId: string): Promise<number> {
  const { rows } = await cliente.query<{ total: number }>(
    "SELECT count(*)::int AS total FROM reactions WHERE upload_id = $1",
    [uploadId],
  );
  return rows[0]?.total ?? 0;
}
