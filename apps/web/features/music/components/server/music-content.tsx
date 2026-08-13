import type { EventoPublico } from "@albora/db";
import { darkEventVars } from "@/features/guest/lib/dark-event-vars";
import { getMusicPage } from "../../data/get-music-page";
import { MusicPage } from "../client/music-page";

export async function MusicContent({
  slug,
  evento,
}: {
  slug: string;
  evento: EventoPublico;
}) {
  const data = await getMusicPage({ slug });

  return (
    <div style={darkEventVars(evento)}>
      <MusicPage {...data} />
    </div>
  );
}
