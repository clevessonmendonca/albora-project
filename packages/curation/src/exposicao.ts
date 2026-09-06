import { luminanceAt } from "./luminance";

/**
 * Fração de pixels com luminância saturada nos extremos do histograma (sombra estourada ou luz
 * estourada). Maior é pior: mais próximo de 1, mais a foto perdeu detalhe de verdade na captura,
 * o que nenhum ajuste recupera depois.
 */
const SHADOW_THRESHOLD = 10; // luminância (0-255) abaixo disto é sombra sem detalhe
const HIGHLIGHT_THRESHOLD = 245; // luminância acima disto é luz estourada

export function exposureScore(pixels: Uint8ClampedArray, width: number, height: number): number {
  const total = width * height;
  if (total <= 0) return 0;

  let saturated = 0;
  for (let i = 0; i < total; i += 1) {
    const luminance = luminanceAt(pixels, i);
    if (luminance <= SHADOW_THRESHOLD || luminance >= HIGHLIGHT_THRESHOLD) saturated += 1;
  }

  return saturated / total;
}
