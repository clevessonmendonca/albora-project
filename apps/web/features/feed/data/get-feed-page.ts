import { comEvento, listarDesafios, type EventoPublico } from "@albora/db";
import { getPool } from "@/lib/db";
import { resolveMissions, type ResolvedMission } from "@/features/guest/lib/resolved-missions";
import { eventNameFromPack, packText } from "@/features/guest/lib/pack-text";

export type FeedPageInput = {
  slug: string;
  eventoId: string;
  sessaoId: string;
  evento: EventoPublico;
};

export type FeedPageData = {
  slug: string;
  eventTitle: string;
  missions: ResolvedMission[];
  copy: { missionTitle: string };
  cameraPath: string;
};

export async function getFeedPage(input: FeedPageInput): Promise<FeedPageData> {
  const { slug, eventoId, sessaoId, evento } = input;

  const challenges = await comEvento(getPool(), eventoId, (c) =>
    listarDesafios(c, eventoId, sessaoId),
  );

  return {
    slug,
    eventTitle: eventNameFromPack(evento.packId),
    missions: resolveMissions(evento.packId, challenges),
    copy: { missionTitle: packText(evento.packId, "missao.titulo") },
    cameraPath: `/e/${encodeURIComponent(slug)}/photo`,
  };
}
