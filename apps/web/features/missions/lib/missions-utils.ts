import type { VisibleMission } from "../components/client/missions-page";

export const MISSIONS_PROGRESS_KEY = "albora_missions_last_state";

export type MarcoMissao = "individual" | "halfway" | "all";

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

export function proximaMissao<T extends { done: boolean }>(missions: readonly T[]): T | null {
  return missions.find((m) => !m.done) ?? null;
}

export function rotuloCtaAposEnvio(proxima: { title: string } | null): string {
  return proxima ? `Próxima: ${proxima.title}` : "Continuar tirando";
}

export function marcoMissao(feitas: number, total: number): MarcoMissao {
  if (total > 0 && feitas === total) return "all";
  if (total >= 4 && feitas === Math.floor(total / 2)) return "halfway";
  return "individual";
}

export function chaveProgressoMissoes(missions: readonly { id: string; done: boolean }[]): string {
  return missions.map((m) => `${m.id}:${m.done}`).join("|");
}

export function persistirProgressoMissoes(missions: readonly { id: string; done: boolean }[]): void {
  if (missions.length === 0) return;
  try {
    localStorage.setItem(MISSIONS_PROGRESS_KEY, chaveProgressoMissoes(missions));
  } catch {
    /* quota / modo privado — o toast degrada, o upload não */
  }
}
