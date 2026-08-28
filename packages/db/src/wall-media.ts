import { decidirExibicao, interpretarVeredicto } from "@albora/core";
import type { PoolClient } from "pg";
import { dimensoesDaColuna } from "./dimensoes";
import {
  lerModeracaoDoEvento,
  limiarDenuncias,
  paraEstadoDoEvento,
} from "./moderation-event";
import { thumbKeyFromFull } from "./storage-key";

/** 🔴 Fonte de verdade do telão: state = 'published', depois decidirExibicao() no núcleo — pânico e classificador silencioso seguram aqui. */

const PUBLICADO = "published";

/** Teto por página da parede. A TV acumula e poda no cliente (`WALL_DISPLAY_CACHE_LIMIT`). */
export const TETO_DA_PAREDE = 60;

export type MidiaNaParede = {
  id: string;
  chaveFull: string;
  chaveThumb: string;
  mime: string;
  /** Concessão `ler.identidade`: o primeiro nome de quem enviou, nunca o contato. */
  autor: string;
  criadaEm: Date;
  /** Concessão `ler.contagem`. */
  reacoes: number;
  /** Ausente na fila antiga — não inventa 1080×1920, que escolheria retrato para vídeo deitado. */
  largura?: number;
  altura?: number;
};

type Linha = {
  id: string;
  storage_key: string;
  mime: string;
  display_name: string;
  created_at: Date;
  reacoes: number;
  denuncias: number;
  classifier_verdict: string | null;
  released_by_host: boolean;
  width: number | null;
  height: number | null;
};

/** event_id no WHERE redundante sob RLS — duas camadas para a mesma invariante. */
export async function listarMidiaDaParede(
  cliente: PoolClient,
  eventoId: string,
  limite: number = TETO_DA_PAREDE,
): Promise<MidiaNaParede[]> {
  const teto = Math.min(Math.max(Math.trunc(limite), 1), TETO_DA_PAREDE);

  const moderacao = await lerModeracaoDoEvento(cliente, eventoId);
  const evento = paraEstadoDoEvento(moderacao);
  const limiar = limiarDenuncias(moderacao);

  const { rows } = await cliente.query<Linha>(
    `SELECT u.id, u.storage_key, u.mime, u.created_at, s.display_name,
            u.classifier_verdict, u.released_by_host, u.width, u.height,
            (SELECT count(*) FROM reactions r WHERE r.upload_id = u.id)::int AS reacoes,
            (SELECT count(*) FROM reports rp WHERE rp.upload_id = u.id AND rp.kind = 'ofensivo')::int AS denuncias
       FROM uploads u
       JOIN guest_sessions s ON s.id = u.session_id AND s.event_id = u.event_id
      WHERE u.event_id = $1 AND u.state = $2
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT $3`,
    [eventoId, PUBLICADO, teto],
  );

  return rows
    .filter(
      (l) =>
        decidirExibicao(
          {
            // `state = 'published'` já filtrou o removido: quem chega aqui não está.
            removida: false,
            liberadaPeloAnfitriao: l.released_by_host,
            denuncias: l.denuncias,
            classificador: interpretarVeredicto(l.classifier_verdict),
          },
          evento,
          "telao",
          limiar,
        ).visivel,
    )
    .map((l) => {
      const tamanho = dimensoesDaColuna(l.width, l.height);
      return {
        id: l.id,
        chaveFull: l.storage_key,
        chaveThumb: thumbKeyFromFull(l.storage_key),
        mime: l.mime,
        autor: l.display_name,
        criadaEm: l.created_at,
        reacoes: l.reacoes,
        ...(tamanho ? { largura: tamanho.largura, altura: tamanho.altura } : {}),
      };
    });
}
