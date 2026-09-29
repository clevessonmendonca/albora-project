import type { EventoPublico } from "@albora/db";
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
    <div>
      <MusicPage {...data} />
    </div>
  );
}
