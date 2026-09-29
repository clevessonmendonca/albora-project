import type { EventoPublico } from "@albora/db";
import { getMyPhotosPage } from "../../data/get-my-photos-page";
import { MyPhotosPage } from "../client/my-photos-page";

export async function MyPhotosContent({
  slug,
  eventoId,
  sessaoId,
  evento,
  revisaoAntesDoTelao,
}: {
  slug: string;
  eventoId: string;
  sessaoId: string;
  evento: EventoPublico;
  revisaoAntesDoTelao: boolean;
}) {
  const data = await getMyPhotosPage({ slug, eventoId, sessaoId });

  return (
    <MyPhotosPage {...data} revisaoAntesDoTelao={revisaoAntesDoTelao} />
  );
}
