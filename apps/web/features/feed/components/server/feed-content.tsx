import type { EventoPublico } from "@albora/db";
import { darkEventVars } from "@/features/guest/lib/dark-event-vars";
import { getFeedPage } from "../../data/get-feed-page";
import { FeedPage } from "../client/feed-page";

export async function FeedContent({
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
  const data = await getFeedPage({ slug, eventoId, sessaoId, evento });

  return (
    <div style={darkEventVars(evento)}>
      <FeedPage {...data} eventoId={eventoId} sessaoId={sessaoId} />
    </div>
  );
}
