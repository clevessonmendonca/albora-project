import {
  montarRetrospectiva,
  resolver,
  TETO_DE_PAGINAS_PADRAO,
  type PlanoDoAlbum,
} from "@albora/core";
import { withEvent, janelaDoAlbum, listarMidiaDoAlbum, eventPack } from "@albora/db";
import { PACKS } from "@albora/packs";
import { chapterTitle, planAlbumChapters } from "./album-chapters";
import { getPool } from "@/lib/db";
import { signGet } from "@/lib/r2";

/**
 * A retrospectiva não tem lógica de capítulo própria: reusa o plano do álbum e
 * o `resolver` do núcleo, e troca só o renderizador final. Uma segunda régua de
 * momento diria que a noite tem uma forma no livro e outra na retrospectiva.
 */

const TTL_SEGUNDOS = 900;

export type FotoDaRetrospectiva = {
  id: string;
  urlThumb: string;
  destacada: boolean;
};

export type MomentoServido = {
  id: string;
  titulo: string;
  comecaEm: string | null;
  fotos: FotoDaRetrospectiva[];
};

export type RetrospectivaServida = {
  momentos: MomentoServido[];
  sequenciaUnica: boolean;
  total: number;
};

const VAZIA: RetrospectivaServida = { momentos: [], sequenciaUnica: false, total: 0 };

export async function montarRetrospectivaServida(
  eventId: string,
): Promise<RetrospectivaServida> {
  const dados = await withEvent(getPool(), eventId, async (c) => ({
    midias: await listarMidiaDoAlbum(c, eventId),
    janela: await janelaDoAlbum(c, eventId),
    packId: await eventPack(c, eventId),
  }));

  if (!dados.janela || dados.midias.length === 0) return VAZIA;

  const pack = dados.packId ? PACKS[dados.packId] : undefined;
  const janela = {
    comecaEm: dados.janela.comecaEm,
    terminaEm: dados.janela.terminaEm,
    offsetMinutos: dados.janela.offsetMinutos,
  };
  const plano: PlanoDoAlbum = {
    janela,
    capitulos: planAlbumChapters(janela, pack),
    tetoDePaginas: TETO_DE_PAGINAS_PADRAO,
  };

  const retrospectiva = montarRetrospectiva(resolver(dados.midias, plano));

  const chavePorId = new Map(dados.midias.map((m) => [m.id, m.chaveThumb] as const));

  const momentos = await Promise.all(
    retrospectiva.momentos.map(async (momento) => ({
      id: momento.id,
      titulo: chapterTitle(pack, momento.id),
      comecaEm: momento.comecaEm?.toISOString() ?? null,
      fotos: (
        await Promise.all(
          momento.midias.map(async (m) => {
            const chave = chavePorId.get(m.id);
            if (!chave) return null;
            return {
              id: m.id,
              urlThumb: await signGet(chave, TTL_SEGUNDOS),
              destacada: m.destacada === true,
            };
          }),
        )
      ).filter((f): f is FotoDaRetrospectiva => f !== null),
    })),
  );

  return {
    momentos,
    sequenciaUnica: retrospectiva.sequenciaUnica,
    total: retrospectiva.total,
  };
}
