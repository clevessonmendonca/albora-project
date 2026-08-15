import { comEvento, listarDesafios, type EventoPublico } from "@albora/db";
import { recordFunnelEvent } from "@/features/guest/lib/record-funnel";
import { eventNameFromPack, packText } from "@/features/guest/lib/pack-text";
import { resolveMissions, type ResolvedMission } from "@/features/guest/lib/resolved-missions";
import { getPool } from "@/lib/db";

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
  hostMessageLabel: string;
};

export async function getFeedPage(input: FeedPageInput): Promise<FeedPageData> {
  const { slug, eventoId, sessaoId, evento } = input;

  const challenges = await comEvento(getPool(), eventoId, (c) =>
    listarDesafios(c, eventoId, sessaoId),
  );

  await recordFunnelEvent(eventoId, sessaoId, "feed_open");

  return {
    slug,
    eventTitle: eventNameFromPack(evento.packId),
    missions: resolveMissions(evento.packId, challenges),
    copy: { missionTitle: packText(evento.packId, "missao.titulo") },
    cameraPath: `/e/${encodeURIComponent(slug)}/photo`,
    hostMessageLabel: packText(evento.packId, "recado.rotulo"),
  };
}
