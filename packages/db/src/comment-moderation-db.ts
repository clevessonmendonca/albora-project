import {
  decidirExibicaoDoComentario,
  type EstadoDaMidia,
  type VeredictoDoClassificador,
} from "@albora/core";
import type { PoolClient } from "pg";
import { filtroSemBloqueio } from "./block-db";
import type { ComentarioComAutor } from "./comment-db";
import { ErroComentarioDeOutroEvento } from "./comment-db";
import { lerModeracaoDoEvento, paraEstadoDoEvento } from "./moderation-event";

const PUBLICADO = "published";

export type ResultadoDenunciaComentario = { registrada: boolean };

function veredicto(bruto: string | null): VeredictoDoClassificador {
  return bruto === "suspeito" || bruto === "sem-resposta" ? bruto : "limpo";
}

type LinhaComModeracao = {
  id: string;
  event_id: string;
  upload_id: string;
  session_id: string;
  body: string;
  parent_id: string | null;
  created_at: Date;
  display_name: string;
  denuncias: number;
  classifier_verdict: string | null;
  released_by_host: boolean;
  midia_denuncias: number;
  midia_classifier_verdict: string | null;
  midia_released_by_host: boolean;
  midia_state: string;
};

function paraComAutor(l: LinhaComModeracao): ComentarioComAutor {
  return {
    id: l.id,
    eventoId: l.event_id,
    midiaId: l.upload_id,
    sessaoId: l.session_id,
    texto: l.body,
    respostaA: l.parent_id,
    criadoEm: l.created_at,
    autor: l.display_name,
  };
}

function midiaDaLinha(l: LinhaComModeracao): EstadoDaMidia {
  return {
    removida: l.midia_state !== PUBLICADO,
    liberadaPeloAnfitriao: l.midia_released_by_host,
    denuncias: l.midia_denuncias,
    classificador: veredicto(l.midia_classifier_verdict),
  };
}

/**
 * Comentarios visiveis para a sessao leitora: moderação + bloqueio simetrico.
 */
export async function listarComentariosVisiveisDaFoto(
  cliente: PoolClient,
  eventoId: string,
  uploadId: string,
  sessaoLeitoraId: string,
): Promise<ComentarioComAutor[]> {
  const moderacao = await lerModeracaoDoEvento(cliente, eventoId);
  const evento = paraEstadoDoEvento(moderacao);
  const bloqueio = filtroSemBloqueio("c.session_id", 4);

  const { rows } = await cliente.query<LinhaComModeracao>(
    `SELECT c.id, c.event_id, c.upload_id, c.session_id, c.body, c.parent_id,
            c.created_at, s.display_name,
            c.classifier_verdict, c.released_by_host,
            (SELECT count(*)::int FROM comment_reports cr WHERE cr.comment_id = c.id) AS denuncias,
            u.state AS midia_state,
            u.classifier_verdict AS midia_classifier_verdict,
            u.released_by_host AS midia_released_by_host,
            (SELECT count(*)::int FROM reports rp WHERE rp.upload_id = u.id) AS midia_denuncias
       FROM comments c
       JOIN guest_sessions s ON s.id = c.session_id AND s.event_id = c.event_id
       JOIN uploads u ON u.id = c.upload_id AND u.event_id = c.event_id
      WHERE c.event_id = $1 AND c.upload_id = $2 AND c.state = $3
        AND ${bloqueio}
      ORDER BY c.created_at ASC, c.id ASC`,
    [eventoId, uploadId, PUBLICADO, sessaoLeitoraId],
  );

  return rows
    .filter((l) =>
      decidirExibicaoDoComentario(
        {
          removido: false,
          liberadoPeloAnfitriao: l.released_by_host,
          denuncias: l.denuncias,
          classificador: veredicto(l.classifier_verdict),
        },
        midiaDaLinha(l),
        evento,
      ).visivel,
    )
    .map(paraComAutor);
}

/**
 * Denuncia de comentario — uma sessao, uma vez (spec 014).
 */
export async function denunciarComentario(
  cliente: PoolClient,
  entrada: { comentarioId: string; sessaoId: string },
): Promise<ResultadoDenunciaComentario> {
  const { rowCount: visivel } = await cliente.query(
    "SELECT 1 FROM comments WHERE id = $1 AND state = $2",
    [entrada.comentarioId, PUBLICADO],
  );
  if ((visivel ?? 0) === 0) throw new ErroComentarioDeOutroEvento(entrada.comentarioId);

  const { rowCount } = await cliente.query(
    `INSERT INTO comment_reports (event_id, comment_id, session_id)
     VALUES (NULLIF(current_setting('app.event_id', true), '')::uuid, $1, $2)
     ON CONFLICT (comment_id, session_id) DO NOTHING`,
    [entrada.comentarioId, entrada.sessaoId],
  );

  return { registrada: (rowCount ?? 0) > 0 };
}

export type ComentarioModeracao = {
  id: string;
  midiaId: string;
  autor: string;
  texto: string;
  denuncias: number;
  criadoEm: Date;
  classificador: string | null;
};

/**
 * Comentários recentes do evento para o painel do anfitrião, denúncias primeiro.
 */
export async function listarComentariosParaModeracao(
  cliente: PoolClient,
  eventoId: string,
  limite = 30,
): Promise<ComentarioModeracao[]> {
  const teto = Math.min(Math.max(Math.trunc(limite), 1), 50);

  const { rows } = await cliente.query<{
    id: string;
    upload_id: string;
    body: string;
    created_at: Date;
    display_name: string;
    denuncias: number;
    classifier_verdict: string | null;
  }>(
    `SELECT c.id, c.upload_id, c.body, c.created_at, s.display_name,
            c.classifier_verdict,
            (SELECT count(*)::int FROM comment_reports cr WHERE cr.comment_id = c.id) AS denuncias
       FROM comments c
       JOIN guest_sessions s ON s.id = c.session_id AND s.event_id = c.event_id
      WHERE c.event_id = $1 AND c.state = $2
      ORDER BY denuncias DESC, c.created_at DESC
      LIMIT $3`,
    [eventoId, PUBLICADO, teto],
  );

  return rows.map((l) => ({
    id: l.id,
    midiaId: l.upload_id,
    autor: l.display_name,
    texto: l.body,
    denuncias: l.denuncias,
    criadoEm: l.created_at,
    classificador: l.classifier_verdict,
  }));
}
