import { PACKS, resolvePackText } from "@albora/packs";

export type ResolvedMission = { id: string; title: string };

export type MissionWithStatus = ResolvedMission & { done: boolean };

function resolveTitle(
  packId: string,
  chaveTitulo: string | null,
  tituloCustom: string | null,
): string {
  if (tituloCustom) return tituloCustom;
  const pack = PACKS[packId];
  if (pack && chaveTitulo) return resolvePackText(pack, chaveTitulo);
  return chaveTitulo ?? "";
}

export function resolveMissions(
  packId: string,
  challenges: { id: string; chaveTitulo: string | null; tituloCustom: string | null }[],
): ResolvedMission[] {
  return challenges.map((d) => ({
    id: d.id,
    title: resolveTitle(packId, d.chaveTitulo, d.tituloCustom),
  }));
}

export function resolveMissionsWithStatus(
  packId: string,
  challenges: { id: string; chaveTitulo: string | null; tituloCustom: string | null; feito: boolean }[],
): MissionWithStatus[] {
  return challenges.map((d) => ({
    id: d.id,
    title: resolveTitle(packId, d.chaveTitulo, d.tituloCustom),
    done: d.feito,
  }));
}
