import type { EventoDoHost } from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";

export function adminEventDisplayName(event: Pick<EventoDoHost, "packId" | "slug">): string {
  const pack = PACKS[event.packId];
  return pack ? resolvePackText(pack, "evento.nome") : event.slug;
}
