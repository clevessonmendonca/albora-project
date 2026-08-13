import type { Plano } from "./redimensionar";

/**
 * Planos do evento — espelham a coluna `events.plan` e o §5.2 do doc de produto.
 *
 * O convidado nunca vê nome de plano; estes valores só orientam limites no
 * servidor e avisos no admin.
 */
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

/** Resolução de imagem: planos pagos sobem para 3500px (§6.3). */
export function planoParaRedimensionamento(plano: PlanoDoEvento): Plano {
  return plano === "free" ? "gratis" : "pago";
}

export function parsePlanoDoEvento(valor: unknown): PlanoDoEvento {
  if (valor === "celebration" || valor === "vendor") return valor;
  return "free";
}
