import type { EventoPublico } from "@albora/db";
import { darkEventVars } from "@/features/guest/lib/dark-event-vars";
import { getAlbumPage } from "../../data/get-album-page";
import { AlbumWithTabs } from "../client/album-with-tabs";

export async function AlbumContent({
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
  const data = await getAlbumPage({ slug, eventoId, sessaoId, evento, missionParam });

  return (
    <div style={darkEventVars(evento)}>
      <AlbumWithTabs {...data} />
    </div>
  );
}
