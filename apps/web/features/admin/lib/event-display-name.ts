import { PACKS, resolvePackText } from "@albora/packs";

export function adminEventDisplayName(event: {
  packId: string;
  slug: string;
  title?: string | null;
}): string {
  if (event.title?.trim()) return event.title.trim();
  const pack = PACKS[event.packId];
  return pack ? resolvePackText(pack, "evento.nome") : event.slug;
}
