import type { VisibleMission } from "../components/client/missions-page";

const ROMANOS = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
] as const;

export function toRoman(n: number): string {
  let resto = n;
  let resultado = "";
  for (const [valor, simbolo] of ROMANOS) {
    while (resto >= valor) {
      resultado += simbolo;
      resto -= valor;
    }
  }
  return resultado;
}

export function turnIndex(missions: readonly VisibleMission[]): number {
  const open = missions.findIndex((m) => !m.done);
  if (open >= 0) return open + 1;
  return missions.length;
}

export function photoPathForMission(slug: string, missionId: string | null): string {
  const base = `/e/${encodeURIComponent(slug)}/photo`;
  if (!missionId) return base;
  return `${base}?missao=${encodeURIComponent(missionId)}`;
}
