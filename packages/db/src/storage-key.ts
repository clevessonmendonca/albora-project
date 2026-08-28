/** Derived from stored key, not recalculated: key carries year/month and next-day recalculation points at a nonexistent folder. */
export function thumbKeyFromFull(fullKey: string): string {
  return fullKey.endsWith("/full") ? `${fullKey.slice(0, -"/full".length)}/thumb` : fullKey;
}
