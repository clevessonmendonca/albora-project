import { LADO_MAIOR } from "./midia";

/**
 * Quanto reduzir, e quando desistir de reduzir.
 *
 * Pura de propósito: é a parte da pipeline de imagem que decide se um
 * aparelho de quatro anos conclui o upload ou fica sem memória, e essa
 * decisão precisa ser testável sem canvas, sem navegador e sem aparelho.
 */

export type Plan = "gratis" | "pago";

export type Target = { width: number; height: number };

export const THUMB_SIDE = 320;

/**
 * A qualidade cai junto com o tamanho porque artefato de compressão é menos
 * visível em imagem menor — e o que importa aqui é o peso no 3G do salão.
 */
export const QUALITY = { full: 0.82, thumb: 0.7 } as const;

/**
 * Reduz mantendo proporção, **nunca aumenta**.
 *
 * Ampliar uma foto pequena não acrescenta informação: só gasta banda do
 * convidado e memória do aparelho para entregar a mesma imagem borrada.
 */
export function targetForLongerSide(width: number, height: number, longerSide: number): Target {
  const longer = Math.max(width, height);
  if (longer <= longerSide) return { width, height };

  const factor = longerSide / longer;
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
  };
}

export function fullTarget(width: number, height: number, plan: Plan): Target {
  return targetForLongerSide(width, height, LADO_MAIOR[plan]);
}

export function thumbTarget(width: number, height: number): Target {
  return targetForLongerSide(width, height, THUMB_SIDE);
}

/**
 * Teto de pixels que o aparelho aguenta num canvas.
 *
 * O Safari do iOS derruba canvas acima de um limite de área e devolve tela
 * em branco — **sem erro**. Um Android antigo simplesmente mata a aba. Os
 * dois modos de falha são silenciosos, e é por isso que existe um teto em
 * vez de um try/catch.
 */
export const PIXEL_CAP = {
  /** Aparelho declarado de pouca memória, ou detectado como antigo. */
  modest: 2048 * 2048,
  standard: 4096 * 4096,
} as const;

/**
 * Degrada a resolução até caber no teto do aparelho — **degradar, nunca
 * falhar**.
 *
 * Uma foto menor entra no álbum. Uma foto que não processa vira convidado
 * que desiste, e o custo disso é participação, que é a única métrica que
 * decide o produto.
 */
export function targetThatFits(target: Target, pixelCap: number): Target {
  const pixels = target.width * target.height;
  if (pixels <= pixelCap) return target;

  const factor = Math.sqrt(pixelCap / pixels);
  return {
    width: Math.max(1, Math.floor(target.width * factor)),
    height: Math.max(1, Math.floor(target.height * factor)),
  };
}

export type Device = { memoryGb?: number | undefined; cores?: number | undefined };

/**
 * Escolhe o teto a partir do que o navegador informa.
 *
 * Na dúvida assume o padrão: um aparelho capaz tratado como modesto entrega
 * foto pior a todo mundo, e a maioria dos aparelhos numa festa é capaz. O
 * caso modesto é exceção, e exceção não pode virar regra por precaução.
 */
export function pixelCapForDevice(device: Device): number {
  const { memoryGb, cores } = device;

  if (typeof memoryGb === "number" && memoryGb <= 2) return PIXEL_CAP.modest;
  if (typeof cores === "number" && cores <= 2) return PIXEL_CAP.modest;

  return PIXEL_CAP.standard;
}

/** O alvo final: plano, orientação já aplicada, e o que o aparelho aguenta. */
export function planProcessing(input: {
  width: number;
  height: number;
  plan: Plan;
  device: Device;
}): { full: Target; thumb: Target; quality: typeof QUALITY } {
  const cap = pixelCapForDevice(input.device);
  const full = targetThatFits(fullTarget(input.width, input.height, input.plan), cap);

  return {
    full,
    // A miniatura sai do alvo já reduzido, não do original: reprocessar o
    // original dobraria o pico de memória no aparelho mais fraco.
    thumb: thumbTarget(full.width, full.height),
    quality: QUALITY,
  };
}
