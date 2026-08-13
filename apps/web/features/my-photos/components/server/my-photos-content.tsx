import type { EventoPublico } from "@albora/db";
import { eventVars } from "@/features/guest/lib/event-vars";
import { getMyPhotosPage } from "../../data/get-my-photos-page";
import { MyPhotosPage } from "../client/my-photos-page";

export async function MyPhotosContent({
  slug,
  eventoId,
  sessaoId,
  evento,
}: {
  slug: string;
  eventoId: string;
  sessaoId: string;
  evento: EventoPublico;
}) {
  const data = await getMyPhotosPage({ slug, eventoId, sessaoId });

  return (
    <div style={eventVars(evento)}>
      <MyPhotosPage {...data} />
    </div>
  );
}
