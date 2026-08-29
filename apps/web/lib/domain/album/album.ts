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
import { getPool } from "../../infrastructure/database/client";
import { signGet } from "../../infrastructure/storage/r2-client";

/** Montagem do álbum (spec 016): servidor assina URLs, navegador busca direto no storage; núcleo é a única fonte de diagramação; sem reação, chave ou nome na resposta. */

/** Validade da URL de leitura, igual ao lote de mídia — cliente renova o álbum inteiro quando `expiraEm` passa. */
export const GET_URL_TTL_SECONDS = 900;

export type ServedSlot = { id: string; proporcao: string; fracao: number };

export type ServedPhoto = {
  id: string;
  url: string;
  urlThumb: string;
  mime: string;
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
    data.midias.map((m) => [m.id, { full: m.chaveFull, thumb: m.chaveThumb, mime: m.mime }] as const),
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
                mime: chave?.mime ?? "image/jpeg",
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
