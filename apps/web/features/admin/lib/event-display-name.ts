import type { EventoDoHost } from "@albora/db";
import { PACKS, texto } from "@albora/packs";

export function adminEventDisplayName(event: Pick<EventoDoHost, "packId" | "slug">): string {
  const pack = PACKS[event.packId];
  return pack ? texto(pack, "evento.nome") : event.slug;
}
