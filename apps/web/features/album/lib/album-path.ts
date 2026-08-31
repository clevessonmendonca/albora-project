export function albumPath(slug: string, missionId: string | null): string {
  const base = `/e/${encodeURIComponent(slug)}/album`;
  if (!missionId) return base;
  return `${base}?missao=${encodeURIComponent(missionId)}`;
}
