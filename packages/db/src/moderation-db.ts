import type { MotivoDeDenuncia } from "@albora/core";
import { MOTIVO_DENUNCIA_PADRAO, ehMotivoDeDenuncia } from "@albora/core";
import type { PoolClient } from "pg";

export type ResultadoDenuncia = { registrada: boolean };

/**
 * Contagem que `decidirExibicao` compara com o limiar. Pedido "sou eu" não entra.
 */
export const SQL_DENUNCIAS_QUE_SEGURAM =
  `(SELECT count(*)::int FROM reports rp WHERE rp.upload_id = u.id AND rp.kind = 'ofensivo')`;

export const SQL_PEDIDOS_DE_REMOCAO =
  `(SELECT count(*)::int FROM reports rp WHERE rp.upload_id = u.id AND rp.kind = 'aparece_na_foto')`;

/**
 * Registra a denúncia de uma foto por uma sessão, uma vez só.
 *
 * A PK (upload_id, session_id) e o `ON CONFLICT DO NOTHING` fazem a mesma
 * sessão denunciar duas vezes contar como uma: "duas denúncias" da spec 011 é
 * duas sessões distintas, o melhor sensor da sala, nunca o toque duplo de uma.
 *
 * `kind = aparece_na_foto` não soma em `contarDenuncias`: o anfitrião decide
 * (flows.md §12 buraco 2). Não há reconhecimento facial.
 *
 * 🔴 A visibilidade da foto é conferida por um SELECT sob RLS **antes** do
 * INSERT, e não pela FK. Checagem de FK ignora RLS (o Postgres a roda como dono
 * para garantir integridade): um INSERT direto com o upload de outro evento não
 * estouraria — a FK acharia a foto alheia e gravaria uma linha inerte. Pior,
 * distinguir "foto existe em outra festa" (FK passa) de "id não existe" (FK
 * falha) vazaria a existência do id noutro evento. Por isso os dois casos
 * terminam no mesmo erro, e o chamador responde o mesmo "não existe".
 *
 * O `event_id` **não vem do cliente**: sai do `app.event_id` da transação já
 * escopada por `comEvento`, o mesmo GUC que a RLS confere.
 *
 * `registrada: false` significa que já havia denúncia daquela sessão — não um
 * erro, e nunca revela de quem foi a primeira.
 */
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

/**
 * Quantas sessões distintas denunciaram a foto como conteúdo ofensivo — o
 * número que `decidirExibicao` compara com o limiar para segurar do telão.
 *
 * A RLS escopa a contagem ao evento do contexto; nenhum `event_id` chega por
 * parâmetro, ele é o da transação e só ele.
 */
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
