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
};

export type ResultadoConfirm =
  | { estado: "criado"; upload: LinhaUpload }
  | { estado: "ja_existia"; upload: LinhaUpload };

/**
 * Persiste o upload, uma vez só.
 *
 * **Retry é o caminho normal, não a exceção.** O convidado está num salão com
 * 200 celulares na mesma antena; o mesmo `uploadId` vai chegar duas, três
 * vezes. `ON CONFLICT DO NOTHING` faz a segunda chamada devolver a linha
 * existente em vez de duplicar a foto no álbum ou estourar violação de chave.
 *
 * O `event_id` **não vem do cliente**: vem da sessão, e a política de RLS
 * ainda o confere. Duas camadas para a mesma invariante.
 */
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
  },
): Promise<ResultadoConfirm> {
  const { rows: inseridas } = await cliente.query<LinhaUpload>(
    `INSERT INTO uploads (id, event_id, session_id, challenge_id, storage_key, mime, bytes, caption)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING
     RETURNING id, event_id AS "eventId", session_id AS "sessionId",
               challenge_id AS "challengeId", storage_key AS "storageKey",
               mime, bytes, caption`,
    [
      entrada.uploadId,
      entrada.eventId,
      entrada.sessionId,
      entrada.challengeId,
      entrada.storageKey,
      entrada.mime,
      entrada.bytes,
      entrada.caption,
    ],
  );

  const criada = inseridas[0];
  if (criada) return { estado: "criado", upload: criada };

  const { rows: existentes } = await cliente.query<LinhaUpload>(
    `SELECT id, event_id AS "eventId", session_id AS "sessionId",
            challenge_id AS "challengeId", storage_key AS "storageKey",
            mime, bytes, caption
     FROM uploads WHERE id = $1`,
    [entrada.uploadId],
  );

  const existente = existentes[0];
  if (!existente) {
    // A linha existe (o INSERT conflitou) mas não é visível: pertence a outro
    // evento. É a RLS trabalhando, e a resposta correta é a mesma de "não
    // existe" — dizer "já existe em outro evento" já vaza informação.
    throw new ErroUploadDeOutroEvento(entrada.uploadId);
  }

  return { estado: "ja_existia", upload: existente };
}

export class ErroUploadDeOutroEvento extends Error {
  readonly code = "upload.conflito_entre_eventos";
  constructor(readonly uploadId: string) {
    super("uploadId já usado fora deste evento");
  }
}
