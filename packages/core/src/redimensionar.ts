import { LADO_MAIOR } from "./midia";

export type Plan = "gratis" | "pago";

export type Target = { width: number; height: number };

export const THUMB_SIDE = 320;

/** Qualidade cai com o tamanho: artefato é menos visível em imagem menor, e o peso no 3G é o que importa. */
export const QUALITY = { full: 0.82, thumb: 0.7 } as const;

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

/** Safari iOS derruba canvas silenciosamente sem erro; Android antigo mata a aba — teto em vez de try/catch. */
export const PIXEL_CAP = {
  /** Aparelho declarado de pouca memória, ou detectado como antigo. */
  modest: 2048 * 2048,
  standard: 4096 * 4096,
} as const;

/** Degrada, nunca falha: foto menor entra no álbum; foto que não processa vira desistência. */
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
