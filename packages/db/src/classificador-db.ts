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

/** event_id no WHERE redundante sob RLS — duas camadas para a mesma invariante. Não cruza eventos. */
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

/** Primeiro escritor ganha — `WHERE classifier_verdict IS NULL` impede que retry de dois polls simultâneos sobrescreva. */
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
