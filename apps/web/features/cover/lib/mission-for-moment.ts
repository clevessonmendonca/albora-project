import type { Pack } from "@albora/packs";

export function missionForMoment(
  pack: Pack | undefined,
  momentId: string,
  challenges: { id: string; chaveTitulo: string }[],
): string | null {
  if (!pack) return null;
  const template = pack.missoes.find((m) => m.id === momentId);
  if (!template) return null;
  return challenges.find((d) => d.chaveTitulo === template.chaveTitulo)?.id ?? null;
}
