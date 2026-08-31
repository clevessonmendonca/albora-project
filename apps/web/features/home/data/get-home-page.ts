import type { EventoPublico } from "@albora/db";
import { eventNameFromPack, packText } from "@/features/guest/lib/pack-text";

export type HomePageInput = {
  slug: string;
  evento: EventoPublico;
};

export type HomePageData = {
  slug: string;
  eventName: string;
  coverHref: string;
  cameraPath: string;
  anfitriaoPlural: string;
};

/** `eventName` via `eventNameFromPack` — quando o campo de título for configurável, troca aqui, num lugar só. */
export function getHomePage({ slug, evento }: HomePageInput): HomePageData {
  const base = `/e/${encodeURIComponent(slug)}`;

  return {
    slug,
    eventName: eventNameFromPack(evento.packId),
    coverHref: `${base}/cover`,
    cameraPath: `${base}/photo`,
    anfitriaoPlural: packText(evento.packId, "anfitriao.plural"),
  };
}
