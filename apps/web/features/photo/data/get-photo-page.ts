import {
  comEvento,
  contarVideosDaSessao,
  listarDesafios,
  planoDoEvento,
  type EventoPublico,
} from "@albora/db";
import { limiteVideosPorConvidado, type PlanoDoEvento } from "@albora/core";
import { getPool } from "@/lib/db";
import { isInteractionOpen } from "@/features/cover/lib/is-interaction-open";
import { resolveMissionsWithStatus } from "@/features/guest/lib/resolved-missions";
import { eventNameFromPack, packText } from "@/features/guest/lib/pack-text";
import { placesFromPack, type PlaceOption } from "../lib/places-from-pack";
import { PACKS } from "@albora/packs";
import type { CotaVideo } from "@/features/photo/hooks/use-upload";
import type { MissionWithStatus } from "@/features/guest/lib/resolved-missions";

export type PhotoPageInput = {
  slug: string;
  eventoId: string;
  sessaoId: string;
  evento: EventoPublico;
  missionParam?: string | undefined;
};

export type PhotoPageData = {
  slug: string;
  eventoId: string;
  plan: PlanoDoEvento;
  videoQuota: CotaVideo;
  eventTitle: string;
  recommendedFilter: string | null;
  interactionOpen: boolean;
  initialMission: string | null;
  missions: MissionWithStatus[];
  places: PlaceOption[];
  copy: { placeQuestion: string };
};

export async function getPhotoPage(input: PhotoPageInput): Promise<PhotoPageData> {
  const { slug, eventoId, sessaoId, evento, missionParam } = input;
  const pack = PACKS[evento.packId];

  const [challenges, planData] = await Promise.all([
    comEvento(getPool(), eventoId, (c) => listarDesafios(c, eventoId, sessaoId)),
    comEvento(getPool(), eventoId, async (c) => {
      const plan = await planoDoEvento(c, eventoId);
      const sent = await contarVideosDaSessao(c, eventoId, sessaoId);
      return { plan, sent };
    }),
  ]);

  const missions = resolveMissionsWithStatus(evento.packId, challenges);
  const initialMission =
    missionParam && challenges.some((d) => d.id === missionParam) ? missionParam : null;

  return {
    slug,
    eventoId,
    plan: planData.plan,
    videoQuota: {
      limite: limiteVideosPorConvidado(planData.plan),
      enviados: planData.sent,
    },
    eventTitle: eventNameFromPack(evento.packId),
    recommendedFilter: evento.filtroRecomendado,
    interactionOpen: isInteractionOpen(evento),
    initialMission,
    missions,
    places: placesFromPack(pack),
    copy: { placeQuestion: packText(evento.packId, "lugar.pergunta") },
  };
}
