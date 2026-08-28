import { withEvent, listChallenges, type EventoPublico } from "@albora/db";
import { getPool } from "@/lib/db";
import { resolveMissions, type ResolvedMission } from "@/features/guest/lib/resolved-missions";

export type AlbumPageInput = {
  slug: string;
  eventoId: string;
  sessaoId: string;
  evento: EventoPublico;
  missionParam?: string | undefined;
};

export type AlbumPageData = {
  slug: string;
  missions: ResolvedMission[];
  initialMission: string | null;
  cameraPath: string;
};

export async function getAlbumPage(input: AlbumPageInput): Promise<AlbumPageData> {
  const { slug, eventoId, sessaoId, evento, missionParam } = input;

  const challenges = await withEvent(getPool(), eventoId, (c) =>
    listChallenges(c, eventoId, sessaoId),
  );

  const missions = resolveMissions(evento.packId, challenges);
  const initialMission =
    missionParam && challenges.some((d) => d.id === missionParam) ? missionParam : null;

  return {
    slug,
    missions,
    initialMission,
    cameraPath: `/e/${encodeURIComponent(slug)}/photo`,
  };
}
