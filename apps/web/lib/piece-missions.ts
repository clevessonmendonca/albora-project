import { isValidMissionKey, resolvePackText, type Pack } from "@albora/packs";
import type { PieceFormat } from "@albora/tokens";

/** N1.6: 4–6 na placa. O resto vive no app. */
export const PLATE_MISSION_CAP = 6;

/** N1.6: 3–4 no card de mesa. */
export const TABLE_CARD_MISSION_CAP = 4;

export function missionCap(formato: PieceFormat): number {
  if (formato === "placa-a4") return PLATE_MISSION_CAP;
  if (formato === "card-de-mesa") return TABLE_CARD_MISSION_CAP;
  return 0;
}

/** Títulos para imprimir, na ordem do editor: só chave de vocabulário do pack; texto livre e chave de outro pack caem fora — a placa não inventa. */
export function missionTitlesForPrint(pack: Pack | undefined, keys: readonly string[]): string[] {
  if (!pack) return [];
  const titles: string[] = [];
  for (const key of keys) {
    if (!isValidMissionKey(pack, key)) continue;
    const title = resolvePackText(pack, key);
    if (title === key) continue;
    titles.push(title);
  }
  return titles;
}

export function highlightedMissions(formato: PieceFormat, titles: readonly string[]): string[] {
  return titles
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, missionCap(formato));
}
