import { PACKS, texto } from "@albora/packs";

export type ResolvedMission = { id: string; title: string };

export type MissionWithStatus = ResolvedMission & { done: boolean };

export function resolveMissions(
  packId: string,
  challenges: { id: string; chaveTitulo: string }[],
): ResolvedMission[] {
  const pack = PACKS[packId];
  return challenges.map((d) => ({
    id: d.id,
    title: pack ? texto(pack, d.chaveTitulo) : d.chaveTitulo,
  }));
}

export function resolveMissionsWithStatus(
  packId: string,
  challenges: { id: string; chaveTitulo: string; feito: boolean }[],
): MissionWithStatus[] {
  const pack = PACKS[packId];
  return challenges.map((d) => ({
    id: d.id,
    title: pack ? texto(pack, d.chaveTitulo) : d.chaveTitulo,
    done: d.feito,
  }));
}
