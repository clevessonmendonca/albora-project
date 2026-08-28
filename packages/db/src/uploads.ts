import type { PoolClient } from "pg";

export type LinhaUpload = {
  id: string;
  eventId: string;
  sessionId: string;
  challengeId: string | null;
  storageKey: string;
  mime: string;
  bytes: number;
  caption: string | null;
  place: string | null;
  takenAt: Date | null;
  width: number | null;
  height: number | null;
  promptKey: string | null;
};

export type ResultadoConfirm =
  | { estado: "criado"; upload: LinhaUpload }
  | { estado: "ja_existia"; upload: LinhaUpload };

/** `pg_advisory_xact_lock` — dois confirms paralelos sem lock davam 403 e a foto era descartada da fila; `event_id` vem da sessão, nunca do cliente. */
export async function confirmarUpload(
  cliente: PoolClient,
  entrada: {
    uploadId: string;
    eventId: string;
    sessionId: string;
    challengeId: string | null;
    storageKey: string;
    mime: string;
    bytes: number;
    caption: string | null;
    place: string | null;
    takenAt?: Date | null;
    width?: number | null;
    height?: number | null;
    /** Chave de vocabulário do confessionário (só vídeo). */
    promptKey?: string | null;
  },
): Promise<ResultadoConfirm> {
  // `xact`, nunca de sessão — pooling em modo transação devolve a conexão a cada COMMIT; lock de sessão vazaria para o próximo cliente.
  await cliente.query("SELECT pg_advisory_xact_lock(hashtext($1))", [entrada.uploadId]);

  const returning = `id, event_id AS "eventId", session_id AS "sessionId",
               challenge_id AS "challengeId", storage_key AS "storageKey",
               mime, bytes, caption, place,
               taken_at AS "takenAt", width, height,
               prompt_key AS "promptKey"`;

  const { rows: inseridas } = await cliente.query<LinhaUpload>(
    `INSERT INTO uploads (id, event_id, session_id, challenge_id, storage_key, mime, bytes, caption, place, taken_at, width, height, prompt_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (id) DO NOTHING
     RETURNING ${returning}`,
    [
      entrada.uploadId,
      entrada.eventId,
      entrada.sessionId,
      entrada.challengeId,
      entrada.storageKey,
      entrada.mime,
      entrada.bytes,
      entrada.caption,
      entrada.place,
      entrada.takenAt ?? null,
      entrada.width ?? null,
      entrada.height ?? null,
      entrada.promptKey ?? null,
    ],
  );

  const criada = inseridas[0];
  if (criada) return { estado: "criado", upload: criada };

  const { rows: existentes } = await cliente.query<LinhaUpload>(
    `SELECT ${returning}
     FROM uploads WHERE id = $1`,
    [entrada.uploadId],
  );

  const existente = existentes[0];
  if (!existente) {
    // RLS esconde a linha de outro evento — dizer "já existe em outro evento" vazaria informação; trata como inexistente.
    throw new ErroUploadDeOutroEvento(entrada.uploadId);
  }

  return { estado: "ja_existia", upload: existente };
}

/** `session_id` no WHERE — RLS garante o evento, ela não sabe de quem é a foto dentro dele. */
export async function anotarUpload(
  cliente: PoolClient,
  entrada: {
    uploadId: string;
    sessionId: string;
    caption: string | null;
    place: string | null;
  },
): Promise<boolean> {
  const { rowCount } = await cliente.query(
    `UPDATE uploads
        SET caption = COALESCE($3, caption),
            place   = COALESCE($4, place)
      WHERE id = $1 AND session_id = $2`,
    [entrada.uploadId, entrada.sessionId, entrada.caption, entrada.place],
  );

  return (rowCount ?? 0) > 0;
}

/** Marca como removida uma foto da própria sessão (spec 008, ADR 0004). */
export async function removerUploadProprio(
  cliente: PoolClient,
  uploadId: string,
  sessaoId: string,
): Promise<boolean> {
  const { rowCount } = await cliente.query(
    `UPDATE uploads SET state = 'removed' WHERE id = $1 AND session_id = $2 AND state = 'published'`,
    [uploadId, sessaoId],
  );
  return (rowCount ?? 0) > 0;
}

export class ErroUploadDeOutroEvento extends Error {
  readonly code = "upload.conflito_entre_eventos";
  constructor(readonly uploadId: string) {
    super("uploadId já usado fora deste evento");
  }
}
