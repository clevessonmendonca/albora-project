import type { EventoPublico } from "@albora/db";
import { withEvent, listChallenges } from "@albora/db";
import { getPool } from "@/lib/db";
import { darkEventVars } from "@/features/guest/lib/dark-event-vars";
import { resolveMissionsWithStatus } from "@/features/guest/lib/resolved-missions";
import { getHomePage } from "../../data/get-home-page";
import { HomePage } from "../client/home-page";

export async function HomeContent({
  slug,
  evento,
  sessaoId,
}: {
  slug: string;
  evento: EventoPublico;
  sessaoId: string;
}) {
  const data = getHomePage({ slug, evento });
  const challenges = await withEvent(getPool(), evento.eventoId, (c) =>
    listChallenges(c, evento.eventoId, sessaoId),
  );

  return (
    <div style={darkEventVars(evento)}>
      <HomePage {...data} missions={resolveMissionsWithStatus(evento.packId, challenges)} />
    </div>
  );
}
