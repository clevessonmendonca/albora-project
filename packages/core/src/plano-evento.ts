import type { Plan } from "./redimensionar";

/** O convidado nunca vê nome de plano — orienta limites no servidor e avisos no admin. */
export type PlanoDoEvento = "free" | "celebration" | "vendor";

/** Vídeos por convidado. `null` = sem teto prático. */
export const VIDEOS_POR_CONVIDADO: Readonly<Record<PlanoDoEvento, number | null>> = {
  free: 1,
  celebration: null,
  vendor: null,
};

export function limiteVideosPorConvidado(plano: PlanoDoEvento): number | null {
  return VIDEOS_POR_CONVIDADO[plano];
}

export function podeEnviarVideo(plano: PlanoDoEvento, enviados: number): boolean {
  const limite = limiteVideosPorConvidado(plano);
  if (limite === null) return true;
  return enviados < limite;
}

export function planoParaRedimensionamento(plano: PlanoDoEvento): Plan {
  return plano === "free" ? "gratis" : "pago";
}

/** Telão ao vivo é gate do Completo / Fornecedor — nunca fricção no convidado. */
export function podeUsarTelao(plano: PlanoDoEvento): boolean {
  return plano !== "free";
}

export function podeBaixarZip(plano: PlanoDoEvento): boolean {
  return plano !== "free";
}

export function parsePlanoDoEvento(valor: unknown): PlanoDoEvento {
  if (valor === "celebration" || valor === "vendor") return valor;
  return "free";
}
