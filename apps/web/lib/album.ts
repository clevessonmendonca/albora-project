import {
  montarAlbum,
  modoInteracao,
  TETO_DE_PAGINAS_PADRAO,
  type ModoInteracao,
  type PlanoDoAlbum,
} from "@albora/core";
import { withEvent, eventGate, janelaDoAlbum, listarMidiaDoAlbum, eventPack } from "@albora/db";
import { PACKS } from "@albora/packs";
import { chapterTitle, planAlbumChapters } from "./album-chapters";
import { getPool } from "./db";
import { signGet } from "./r2";

/**
 * A montagem servida do álbum da noite (spec 016).
 *
 * O servidor **nunca serve mídia**: assina URLs de leitura e o navegador busca
 * os bytes direto no object storage. A montagem é derivada — corre
 * `montarAlbum()` do `@albora/core` sobre a mídia publicada do evento, e o
 * núcleo é a única fonte da diagramação por slots. Os capítulos da noite
 * saem dos momentos do pack, fatiados na janela do evento — `taken_at` já
 * está no upload; não há segundo pipeline de captura. Mídia com `promptKey`
 * (confessionário) vira capítulo virtual no núcleo, com título via pack.
 *
 * O que sai daqui não carrega contagem de reação (verificação 5 da spec: sem
 * contagem visível), nem a chave de storage, nem nome de convidado. O que o
 * cliente recebe é onde cada foto entra na página e a URL para buscá-la.
 */

/**
 * Validade da URL de leitura, igual à do lote da mídia. O cliente renova o
 * álbum inteiro de uma vez quando `expiraEm` passa.
 */
export const GET_URL_TTL_SECONDS = 900;

export type ServedSlot = { id: string; proporcao: string; fracao: number };

export type ServedPhoto = {
  id: string;
  url: string;
  urlThumb: string;
  missaoId: string | null;
  slot: ServedSlot;
};

export type ServedPage = {
  layoutId: string;
  amanhecer: boolean;
  hora: number | null;
  inicioDaHora: string | null;
  lugarId: string | null;
  fotos: ServedPhoto[];
};

export type ServedChapter = {
  id: string;
  titulo: string;
  comecaEm: string | null;
  paginas: ServedPage[];
};

export type ServedAlbum = {
  capitulos: ServedChapter[];
  totalDePaginas: number;
  contadores: { fotos: number; convidados: number; missoes: number };
  interacao: ModoInteracao;
  expiraEm: number;
};

const EMPTY = (expiresAt: number, interacao: ModoInteracao): ServedAlbum => ({
  capitulos: [],
  totalDePaginas: 0,
  contadores: { fotos: 0, convidados: 0, missoes: 0 },
  interacao,
  expiraEm: expiresAt,
});

export async function buildServedAlbum(eventId: string): Promise<ServedAlbum> {
  const expiresAt = Date.now() + GET_URL_TTL_SECONDS * 1000;

  const data = await withEvent(getPool(), eventId, async (c) => {
    const midias = await listarMidiaDoAlbum(c, eventId);
    const janela = await janelaDoAlbum(c, eventId);
    const packId = await eventPack(c, eventId);
    const gate = await eventGate(c, eventId);
    return { midias, janela, packId, gate };
  });

  const interacao = data.gate ? modoInteracao(data.gate, new Date()) : "espelho";

  if (!data.janela || data.midias.length === 0) return EMPTY(expiresAt, interacao);

  const pack = data.packId ? PACKS[data.packId] : undefined;
  const janela = {
    comecaEm: data.janela.comecaEm,
    terminaEm: data.janela.terminaEm,
    offsetMinutos: data.janela.offsetMinutos,
  };
  const plan: PlanoDoAlbum = {
    janela,
    capitulos: planAlbumChapters(janela, pack),
    tetoDePaginas: TETO_DE_PAGINAS_PADRAO,
  };

  const album = montarAlbum(data.midias, plan);

  // A chave nunca sai do servidor; o mapa liga o id da foto montada à chave que
  // será assinada, sem confiar em campo que o núcleo não declara no seu tipo.
  const keyById = new Map(
    data.midias.map((m) => [m.id, { full: m.chaveFull, thumb: m.chaveThumb }] as const),
  );

  const capitulos = await Promise.all(
    album.capitulos.map(async (capitulo) => ({
      id: capitulo.id,
      titulo: chapterTitle(pack, capitulo.id),
      comecaEm: capitulo.comecaEm?.toISOString() ?? null,
      paginas: await Promise.all(
        capitulo.paginas.map(async (pagina) => ({
          layoutId: pagina.layoutId,
          amanhecer: pagina.amanhecer,
          hora: pagina.hora,
          inicioDaHora: pagina.inicioDaHora?.toISOString() ?? null,
          lugarId: pagina.lugarId,
          fotos: await Promise.all(
            pagina.fotos.map(async (foto) => {
              const chave = keyById.get(foto.midia.id);
              const [url, urlThumb] = await Promise.all([
                chave ? signGet(chave.full, GET_URL_TTL_SECONDS) : Promise.resolve(""),
                chave ? signGet(chave.thumb, GET_URL_TTL_SECONDS) : Promise.resolve(""),
              ]);
              return {
                id: foto.midia.id,
                url,
                urlThumb,
                missaoId: foto.midia.missaoId,
                slot: {
                  id: foto.slot.id,
                  proporcao: foto.slot.proporcao,
                  fracao: foto.slot.fracao,
                },
              };
            }),
          ),
        })),
      ),
    })),
  );

  return {
    capitulos,
    totalDePaginas: album.totalDePaginas,
    contadores: album.contadores,
    interacao,
    expiraEm: expiresAt,
  };
}

/** @deprecated use GET_URL_TTL_SECONDS */
export const VALIDADE_GET_SEGUNDOS = GET_URL_TTL_SECONDS;

/** @deprecated use ServedSlot */
export type SlotServido = ServedSlot;

/** @deprecated use ServedPhoto */
export type FotoServida = ServedPhoto;

/** @deprecated use ServedPage */
export type PaginaServida = ServedPage;

/** @deprecated use ServedChapter */
export type CapituloServido = ServedChapter;

/** @deprecated use ServedAlbum */
export type AlbumServido = ServedAlbum;

/** @deprecated use buildServedAlbum */
export const montarAlbumServido = buildServedAlbum;
