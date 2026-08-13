import type { EventoPublico } from "@albora/db";
import { getCover } from "../../data/get-cover";
import { CoverPage } from "../client/cover-page";

export async function CoverContent({
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
  const data = await getCover({ slug, eventoId, sessaoId, evento });
  return <CoverPage {...data} />;
}
