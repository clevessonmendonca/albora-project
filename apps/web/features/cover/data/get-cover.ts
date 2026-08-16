import { comEvento, listarDesafios, musicaDoCasal, packDoEvento, type EventoPublico } from "@albora/db";
import { exibirMusica } from "@albora/core";
import { PACKS, resolvePackText } from "@albora/packs";
import { getPool } from "@/lib/db";
import { montarAlbumServido } from "@/lib/album";
import { isInteractionOpen } from "../lib/is-interaction-open";
import { missionForMoment } from "../lib/mission-for-moment";
import type { CoverData } from "../types/cover";

export type CoverInput = {
  slug: string;
  eventoId: string;
  sessaoId: string;
  evento: EventoPublico;
};

export async function getCover(input: CoverInput): Promise<CoverData> {
  const { slug, eventoId, sessaoId, evento } = input;

  const [challenges, packId, album, chosen] = await Promise.all([
    comEvento(getPool(), eventoId, (c) => listarDesafios(c, eventoId, sessaoId)),
    comEvento(getPool(), eventoId, (c) => packDoEvento(c, eventoId)),
    montarAlbumServido(eventoId),
    comEvento(getPool(), eventoId, (c) => musicaDoCasal(c, eventoId)),
  ]);

  const pack = packId ? PACKS[packId] : undefined;
  const musicLabel = chosen ? exibirMusica(chosen.link, chosen.metadado).rotulo : null;
  const thumbs = albumThumbs(album, 5);
  const moments = (pack?.momentos ?? []).slice(0, 5).map((m, i) => ({
    id: m.id,
    title: pack ? resolvePackText(pack, m.chaveTitulo) : m.id,
    missionFilterId: missionForMoment(pack, m.id, challenges),
    thumbUrl: thumbs[i] ?? null,
  }));

  return {
    slug,
    eventName: pack ? resolvePackText(pack, "landing.exemplo.nome") : "A festa",
    startsAt: evento.comecaEm.toISOString(),
    album,
    moments,
    interactionOpen: isInteractionOpen(evento),
    musicLabel,
    hostMessageLabel: pack ? resolvePackText(pack, "recado.rotulo") : "Um recado",
    hasConfessional: (pack?.confessionario?.length ?? 0) > 0,
  };
}

function albumThumbs(album: Awaited<ReturnType<typeof montarAlbumServido>>, max: number): string[] {
  const out: string[] = [];
  for (const capitulo of album.capitulos) {
    for (const pagina of capitulo.paginas) {
      for (const foto of pagina.fotos) {
        if (foto.url) {
          out.push(foto.url);
          if (out.length >= max) return out;
        }
      }
    }
  }
  return out;
}
