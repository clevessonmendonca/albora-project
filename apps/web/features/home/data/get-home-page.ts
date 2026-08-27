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

/**
 * `eventName` sai do texto de exemplo do pack (mesma fonte que `/cover` e
 * `/feed` já usam via `eventNameFromPack`). Não existe ainda um campo de
 * "nome do casal" configurável pelo anfitrião em `EventoPublico` — quando
 * existir, troca aqui, num lugar só.
 */
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
