import type { Pack } from "@albora/packs";
import { texto } from "@albora/packs";

export type PlaceOption = { id: string; title: string };

export function placesFromPack(pack: Pack | undefined): PlaceOption[] {
  if (!pack) return [];
  return pack.lugares.map((l) => ({ id: l.id, title: texto(pack, l.chaveTitulo) }));
}
