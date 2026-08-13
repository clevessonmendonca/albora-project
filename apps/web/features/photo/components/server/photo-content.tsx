import type { EventoPublico } from "@albora/db";
import { darkEventVars } from "@/features/guest/lib/dark-event-vars";
import { getPhotoPage } from "../../data/get-photo-page";
import { PhotoPage } from "../client/photo-page";

export async function PhotoContent({
  slug,
  eventoId,
  sessaoId,
  evento,
  missionParam,
}: {
  slug: string;
  eventoId: string;
  sessaoId: string;
  evento: EventoPublico;
  missionParam?: string | undefined;
}) {
  const data = await getPhotoPage({ slug, eventoId, sessaoId, evento, missionParam });

  return (
    <div style={darkEventVars(evento)}>
      <PhotoPage
        slug={data.slug}
        eventoId={data.eventoId}
        plan={data.plan}
        videoQuota={data.videoQuota}
        eventTitle={data.eventTitle}
        missions={data.missions}
        places={data.places}
        copy={data.copy}
        recommendedFilter={data.recommendedFilter}
        initialMission={data.initialMission}
        interactionOpen={data.interactionOpen}
      />
    </div>
  );
}
