import type { EventoPublico } from "@albora/db";
import { getMissionsPage } from "../../data/get-missions-page";
import { MissionsPage } from "../client/missions-page";

export async function MissionsContent({
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
  const data = await getMissionsPage({ slug, eventoId, sessaoId, evento });

  return (
    <div>
      <MissionsPage {...data} />
    </div>
  );
}
