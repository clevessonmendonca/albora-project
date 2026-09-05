import type { VeredictoDoClassificador } from "@albora/core";
import type { Pool, PoolClient } from "pg";

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

/**
 * Rede de segurança: quais eventos têm upload publicado sem veredito, mesmo
 * quando `photo_moderation` não tem NENHUMA linha para eles — o caso em que
 * `enqueueModeration` falhou por completo sob o SAVEPOINT do confirm
 * (`confirm-upload.ts`) e a mídia nunca chegou a existir na fila, então
 * `listEventsWithPendingModeration` (que só olha `photo_moderation`) nunca
 * veria o evento. Cruza eventos de propósito, mesma família de
 * `listEventsWithPendingModeration`: roda no pool do papel `BYPASSRLS`,
 * devolve só `event_id`.
 */
export async function listEventsWithOrphanedUploads(
  pool: Pool,
  limit = 100,
): Promise<string[]> {
  const { rows } = await pool.query<{ event_id: string }>(
    `SELECT DISTINCT event_id FROM uploads
      WHERE state = $1 AND classifier_verdict IS NULL
      LIMIT $2`,
    [PUBLICADO, limit],
  );
  return rows.map((r) => r.event_id);
}

export type UploadParaClassificar = {
  chaveFull: string;
  mime: string;
};

/**
 * Task 6: junta os `uploadId` que a fila (`photo_moderation`) acabou de
 * `claim`ar com os dados de storage que só existem em `uploads` — a fila
 * guarda estado de processamento, não metadado de mídia. `event_id` no
 * WHERE é redundante sob RLS, mesma razão de `listarUploadsPendentesDeClassificacao`.
 */
export async function buscarUploadsParaClassificar(
  cliente: PoolClient,
  eventoId: string,
  uploadIds: string[],
): Promise<Map<string, UploadParaClassificar>> {
  if (uploadIds.length === 0) return new Map();

  const { rows } = await cliente.query<{ id: string; storage_key: string; mime: string }>(
    `SELECT id, storage_key, mime FROM uploads WHERE event_id = $1 AND id = ANY($2::uuid[])`,
    [eventoId, uploadIds],
  );

  return new Map(rows.map((l) => [l.id, { chaveFull: l.storage_key, mime: l.mime }]));
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
