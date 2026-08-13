/**
 * Derives the thumb object key from the full-size key.
 *
 * The thumb lives beside the full under the same event folder. Derived from the
 * stored key, not recalculated by date: the key carries the confirmation year
 * and month, and recalculating the next day would point at a folder that never
 * existed.
 */
export function thumbKeyFromFull(fullKey: string): string {
  return fullKey.endsWith("/full") ? `${fullKey.slice(0, -"/full".length)}/thumb` : fullKey;
}
