import type { EventoPublico } from "@albora/db";
import { darkEventVars } from "@/features/guest/lib/dark-event-vars";
import { getHomePage } from "../../data/get-home-page";
import { HomePage } from "../client/home-page";

export function HomeContent({
  slug,
  evento,
}: {
  slug: string;
  evento: EventoPublico;
}) {
  const data = getHomePage({ slug, evento });

  return (
    <div style={darkEventVars(evento)}>
      <HomePage {...data} />
    </div>
  );
}
