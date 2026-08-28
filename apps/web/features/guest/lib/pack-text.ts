import { PACKS, resolvePackText } from "@albora/packs";

export function packText(packId: string, key: string): string {
  const pack = PACKS[packId];
  return pack ? resolvePackText(pack, key) : key;
}

export function eventNameFromPack(packId: string): string {
  return packText(packId, "landing.exemplo.nome");
}
