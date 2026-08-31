import type { MotivoDeDenuncia } from "@albora/core";
import { MOTIVO_DENUNCIA_PADRAO, ehMotivoDeDenuncia } from "@albora/core";
import type { PoolClient } from "pg";

export type ResultadoDenuncia = { registrada: boolean };

/** Pedido "sou eu" (`aparece_na_foto`) não entra aqui — anfitrião decide, não automação. */
export const SQL_DENUNCIAS_QUE_SEGURAM =
  `(SELECT count(*)::int FROM reports rp WHERE rp.upload_id = u.id AND rp.kind = 'ofensivo')`;

export const SQL_PEDIDOS_DE_REMOCAO =
  `(SELECT count(*)::int FROM reports rp WHERE rp.upload_id = u.id AND rp.kind = 'aparece_na_foto')`;

/** 🔴 SELECT sob RLS antes do INSERT (não FK) — FK ignora RLS e gravaria linha inerte de outro evento; distinguir existência vazaria o id; `event_id` do GUC. */
export async function denunciar(
  cliente: PoolClient,
  entrada: {
    uploadId: string;
    sessaoId: string;
    motivo?: string | null;
    kind?: MotivoDeDenuncia | null;
  },
): Promise<ResultadoDenuncia> {
  const { rowCount: visivel } = await cliente.query("SELECT 1 FROM uploads WHERE id = $1", [
    entrada.uploadId,
  ]);
  if ((visivel ?? 0) === 0) throw new ErroMidiaDeOutroEvento(entrada.uploadId);

  const motivo = entrada.motivo?.trim() || null;
  const kind = ehMotivoDeDenuncia(entrada.kind) ? entrada.kind : MOTIVO_DENUNCIA_PADRAO;

  const { rowCount } = await cliente.query(
    `INSERT INTO reports (event_id, upload_id, session_id, reason, kind)
     VALUES (NULLIF(current_setting('app.event_id', true), '')::uuid, $1, $2, $3, $4)
    ON CONFLICT (upload_id, session_id) DO NOTHING`,
    [entrada.uploadId, entrada.sessaoId, motivo, kind],
  );

  return { registrada: (rowCount ?? 0) > 0 };
}

/** RLS escopa ao evento do contexto — nenhum `event_id` por parâmetro, só o da transação. */
export async function contarDenuncias(cliente: PoolClient, uploadId: string): Promise<number> {
  const { rows } = await cliente.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM reports WHERE upload_id = $1 AND kind = 'ofensivo'`,
    [uploadId],
  );

  return rows[0]?.n ?? 0;
}

export class ErroMidiaDeOutroEvento extends Error {
  readonly code = "midia.conflito_entre_eventos";
  constructor(readonly uploadId: string) {
    super("upload não pertence a este evento");
  }
}
