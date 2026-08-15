import { isValidMissionKey, type Pack } from "@albora/packs";

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

export function toggleMissionKey(
  selected: readonly string[],
  key: string,
  packKeys: readonly string[],
): string[] {
  if (!packKeys.includes(key)) return [...selected];
  if (selected.includes(key)) return selected.filter((k) => k !== key);
  return [...selected, key];
}

export function moveMissionKey(
  selected: readonly string[],
  key: string,
  direction: -1 | 1,
): string[] {
  const from = selected.indexOf(key);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= selected.length) return [...selected];
  const next = [...selected];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function reorderMissionKeys(
  selected: readonly string[],
  fromKey: string,
  toKey: string,
): string[] {
  const from = selected.indexOf(fromKey);
  const to = selected.indexOf(toKey);
  if (from < 0 || to < 0 || from === to) return [...selected];
  const next = [...selected];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}
