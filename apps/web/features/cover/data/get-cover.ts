import { comEvento, listarDesafios, musicaDoCasal, packDoEvento, type EventoPublico } from "@albora/db";
import { exibirMusica } from "@albora/core";
import { PACKS, texto } from "@albora/packs";
import { banco } from "@/lib/banco";
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
    comEvento(banco(), eventoId, (c) => listarDesafios(c, eventoId, sessaoId)),
    comEvento(banco(), eventoId, (c) => packDoEvento(c, eventoId)),
    montarAlbumServido(eventoId),
    comEvento(banco(), eventoId, (c) => musicaDoCasal(c, eventoId)),
  ]);

  const pack = packId ? PACKS[packId] : undefined;
  const musicLabel = chosen ? exibirMusica(chosen.link, chosen.metadado).rotulo : null;
  const moments = (pack?.momentos ?? []).slice(0, 5).map((m) => ({
    id: m.id,
    title: pack ? texto(pack, m.chaveTitulo) : m.id,
    missionFilterId: missionForMoment(pack, m.id, challenges),
  }));

  return {
    slug,
    eventName: pack ? texto(pack, "landing.exemplo.nome") : "A festa",
    startsAt: evento.comecaEm.toISOString(),
    album,
    moments,
    interactionOpen: isInteractionOpen(evento),
    musicLabel,
  };
}
