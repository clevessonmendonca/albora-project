import type { VeredictoDoClassificador } from "@albora/core";
import type { PoolClient } from "pg";

const PUBLICADO = "published";

export const TETO_DO_CLASSIFICADOR = 8;

export type UploadPendenteDeClassificacao = {
  id: string;
  chaveFull: string;
  mime: string;
  criadaEm: Date;
};

/**
 * Fotos publicadas cujo classificador ainda não rodou.
 *
 * Só dentro de `comEvento`: o `event_id` no WHERE é redundante sob RLS e vai
 * mesmo assim. Não cruza eventos — o job recebe o id no payload (poll da
 * parede) e classifica aquele casamento.
 */
export async function listarUploadsPendentesDeClassificacao(
  cliente: PoolClient,
  eventoId: string,
  limite: number = TETO_DO_CLASSIFICADOR,
): Promise<UploadPendenteDeClassificacao[]> {
  const teto = Math.min(Math.max(Math.trunc(limite), 1), TETO_DO_CLASSIFICADOR);

  const { rows } = await cliente.query<{
    id: string;
    storage_key: string;
    mime: string;
    created_at: Date;
  }>(
    `SELECT u.id, u.storage_key, u.mime, u.created_at
       FROM uploads u
      WHERE u.event_id = $1 AND u.state = $2 AND u.classifier_verdict IS NULL
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT $3`,
    [eventoId, PUBLICADO, teto],
  );

  return rows.map((l) => ({
    id: l.id,
    chaveFull: l.storage_key,
    mime: l.mime,
    criadaEm: l.created_at,
  }));
}

/**
 * Grava o veredicto só se ainda estiver nulo: o primeiro escritor ganha.
 * Retry de dois polls da parede no mesmo instante não sobrescreve.
 */
export async function gravarVeredictoUpload(
  cliente: PoolClient,
  uploadId: string,
  veredicto: VeredictoDoClassificador,
): Promise<boolean> {
  const { rowCount } = await cliente.query(
    `UPDATE uploads SET classifier_verdict = $2
      WHERE id = $1 AND classifier_verdict IS NULL`,
    [uploadId, veredicto],
  );
  return (rowCount ?? 0) > 0;
}
