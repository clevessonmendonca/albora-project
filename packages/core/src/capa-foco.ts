export const CAPAS_FOCO = [25, 50, 75] as const;
export type CapaFoco = (typeof CAPAS_FOCO)[number];

export const CAPA_FOCO_PADRAO: CapaFoco = 50;

export function capaFocoValido(valor: unknown): valor is CapaFoco {
  return typeof valor === "number" && (CAPAS_FOCO as readonly number[]).includes(valor);
}

export function capaFocoDoEvento(tokens: Record<string, unknown> | null | undefined): CapaFoco {
  const valor = tokens?.capaFoco;
  return capaFocoValido(valor) ? valor : CAPA_FOCO_PADRAO;
}

export function capaFocoXDoEvento(tokens: Record<string, unknown> | null | undefined): CapaFoco {
  const valor = tokens?.capaFocoX;
  return capaFocoValido(valor) ? valor : CAPA_FOCO_PADRAO;
}

export function capaObjectPosition(foco: CapaFoco, focoX: CapaFoco = CAPA_FOCO_PADRAO): string {
  return `${focoX}% ${foco}%`;
}
