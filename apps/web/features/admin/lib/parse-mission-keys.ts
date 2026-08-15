import { isValidMissionKey, type Pack } from "@albora/packs";

/**
 * Conjunto fechado: só chaves do pack, na ordem, sem duplicata.
 * `null` = corpo inválido (texto livre, id interno, pack errado).
 */
export function parseMissionKeys(pack: Pack, raw: unknown): string[] | null {
  if (!Array.isArray(raw) || !raw.every((k) => typeof k === "string")) return null;

  const seen = new Set<string>();
  const keys: string[] = [];
  for (const key of raw) {
    if (!isValidMissionKey(pack, key) || seen.has(key)) return null;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}
