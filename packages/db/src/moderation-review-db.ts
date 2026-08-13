import {
  decidirExibicaoDoComentario,
  precisaDeRevisao,
  type VeredictoDoClassificador,
} from "@albora/core";
import type { PoolClient } from "pg";
import {
  lerModeracaoDoEvento,
  limiarDenuncias,
  paraEstadoDoEvento,
} from "./moderation-event";

const PUBLICADO = "published";

function veredicto(bruto: string | null): VeredictoDoClassificador {
  return bruto === "suspeito" || bruto === "sem-resposta" ? bruto : "limpo";
}

export type MidiaParaRevisao = {
  id: string;
  autor: string;
  denuncias: number;
  classificador: string | null;
  criadaEm: Date;
  motivo: "denuncias" | "classificador" | "endurecido";
};

export type ComentarioParaRevisao = {
  id: string;
  midiaId: string;
  autor: string;
  texto: string;
  denuncias: number;
  classificador: string | null;
  criadaEm: Date;
};

function motivoMidia(
  classificador: VeredictoDoClassificador,
  endurecido: boolean,
): MidiaParaRevisao["motivo"] {
  if (endurecido) return "endurecido";
  if (classificador === "suspeito") return "classificador";
  return "denuncias";
}

/** Mídia publicada que o anfitrião ainda precisa liberar (spec 011). */
export async function listarMidiaParaRevisao(
  cliente: PoolClient,
  eventoId: string,
  limite = 30,
): Promise<MidiaParaRevisao[]> {
  const moderacao = await lerModeracaoDoEvento(cliente, eventoId);
  const evento = paraEstadoDoEvento(moderacao);
  const limiar = limiarDenuncias(moderacao);
  const teto = Math.min(Math.max(Math.trunc(limite), 1), 50);

  const { rows } = await cliente.query<{
    id: string;
    display_name: string;
    created_at: Date;
    denuncias: number;
    classifier_verdict: string | null;
    released_by_host: boolean;
  }>(
    `SELECT u.id, s.display_name, u.created_at, u.classifier_verdict, u.released_by_host,
            (SELECT count(*)::int FROM reports rp WHERE rp.upload_id = u.id) AS denuncias
       FROM uploads u
       JOIN guest_sessions s ON s.id = u.session_id AND s.event_id = u.event_id
      WHERE u.event_id = $1 AND u.state = $2 AND u.released_by_host = false
      ORDER BY denuncias DESC, u.created_at DESC
      LIMIT $3`,
    [eventoId, PUBLICADO, teto],
  );

  return rows
    .filter((l) =>
      precisaDeRevisao(
        {
          removida: false,
          liberadaPeloAnfitriao: l.released_by_host,
          denuncias: l.denuncias,
          classificador: veredicto(l.classifier_verdict),
        },
        evento,
        limiar,
      ),
    )
    .map((l) => ({
      id: l.id,
      autor: l.display_name,
      denuncias: l.denuncias,
      classificador: l.classifier_verdict,
      criadaEm: l.created_at,
      motivo: motivoMidia(veredicto(l.classifier_verdict), moderacao.modoEndurecido),
    }));
}

type LinhaComentarioRevisao = {
  id: string;
  upload_id: string;
  body: string;
  created_at: Date;
  display_name: string;
  denuncias: number;
  classifier_verdict: string | null;
  released_by_host: boolean;
  midia_state: string;
  midia_denuncias: number;
  midia_classifier_verdict: string | null;
  midia_released_by_host: boolean;
};

/** Comentários publicados retidos pela moderação (spec 014). */
export async function listarComentariosParaRevisao(
  cliente: PoolClient,
  eventoId: string,
  limite = 30,
): Promise<ComentarioParaRevisao[]> {
  const moderacao = await lerModeracaoDoEvento(cliente, eventoId);
  const evento = paraEstadoDoEvento(moderacao);
  const teto = Math.min(Math.max(Math.trunc(limite), 1), 50);

  const { rows } = await cliente.query<LinhaComentarioRevisao>(
    `SELECT c.id, c.upload_id, c.body, c.created_at, s.display_name,
            c.classifier_verdict, c.released_by_host,
            (SELECT count(*)::int FROM comment_reports cr WHERE cr.comment_id = c.id) AS denuncias,
            u.state AS midia_state,
            u.classifier_verdict AS midia_classifier_verdict,
            u.released_by_host AS midia_released_by_host,
            (SELECT count(*)::int FROM reports rp WHERE rp.upload_id = u.id) AS midia_denuncias
       FROM comments c
       JOIN guest_sessions s ON s.id = c.session_id AND s.event_id = c.event_id
       JOIN uploads u ON u.id = c.upload_id AND u.event_id = c.event_id
      WHERE c.event_id = $1 AND c.state = $2 AND c.released_by_host = false
      ORDER BY denuncias DESC, c.created_at DESC
      LIMIT $3`,
    [eventoId, PUBLICADO, teto],
  );

  return rows
    .filter((l) => {
      const midia = {
        removida: l.midia_state !== PUBLICADO,
        liberadaPeloAnfitriao: l.midia_released_by_host,
        denuncias: l.midia_denuncias,
        classificador: veredicto(l.midia_classifier_verdict),
      };
      return !decidirExibicaoDoComentario(
        {
          removido: false,
          liberadoPeloAnfitriao: l.released_by_host,
          denuncias: l.denuncias,
          classificador: veredicto(l.classifier_verdict),
        },
        midia,
        evento,
      ).visivel;
    })
    .map((l) => ({
      id: l.id,
      midiaId: l.upload_id,
      autor: l.display_name,
      texto: l.body,
      denuncias: l.denuncias,
      classificador: l.classifier_verdict,
      criadaEm: l.created_at,
    }));
}

export async function liberarMidiaDoEvento(
  cliente: PoolClient,
  uploadId: string,
): Promise<boolean> {
  const { rowCount } = await cliente.query(
    `UPDATE uploads SET released_by_host = true WHERE id = $1 AND state = $2`,
    [uploadId, PUBLICADO],
  );
  return (rowCount ?? 0) > 0;
}

export async function liberarComentarioDoEvento(
  cliente: PoolClient,
  comentarioId: string,
): Promise<boolean> {
  const { rowCount } = await cliente.query(
    `UPDATE comments SET released_by_host = true WHERE id = $1 AND state = $2`,
    [comentarioId, PUBLICADO],
  );
  return (rowCount ?? 0) > 0;
}
