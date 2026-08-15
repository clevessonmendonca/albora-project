import type { EventoPublico } from "@albora/db";
import { darkEventVars } from "@/features/guest/lib/dark-event-vars";
import { MusicPage } from "@/features/music/components/client/music-page";
import { getMusicPage } from "@/features/music/data/get-music-page";

export async function MusicContent({
  slug,
  evento,
}: {
  slug: string;
  evento: EventoPublico;
}) {
  const data = await getMusicPage({ slug, packId: evento.packId });

  return (
    <div style={darkEventVars(evento)}>
      <MusicPage {...data} />
    </div>
  );
}
