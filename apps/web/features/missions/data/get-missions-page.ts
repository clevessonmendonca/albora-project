import { withEvent, listChallenges, type EventoPublico } from "@albora/db";
import { getPool } from "@/lib/db";
import { resolveMissionsWithStatus, type MissionWithStatus } from "@/features/guest/lib/resolved-missions";

export type MissionsPageInput = {
  slug: string;
  eventoId: string;
  sessaoId: string;
  evento: EventoPublico;
};

export type MissionsPageData = {
  slug: string;
  missions: MissionWithStatus[];
};

export async function getMissionsPage(input: MissionsPageInput): Promise<MissionsPageData> {
  const { slug, eventoId, sessaoId, evento } = input;

  const challenges = await withEvent(getPool(), eventoId, (c) =>
    listChallenges(c, eventoId, sessaoId),
  );

  return {
    slug,
    missions: resolveMissionsWithStatus(evento.packId, challenges),
  };
}
