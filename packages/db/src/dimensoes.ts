/** Um lado só não serve — largura real com altura padrão vira paisagem no slot de retrato e corta cabeça; ausente, quem lê decide o fallback. */

export const LARGURA_PADRAO = 1080;
export const ALTURA_PADRAO = 1920;

export function dimensoesDaColuna(
  width: number | null,
  height: number | null,
): { largura: number; altura: number } | null {
  if (
    width !== null &&
    height !== null &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  ) {
    return { largura: width, altura: height };
  }
  return null;
}

export function dimensoesDoAlbum(
  width: number | null,
  height: number | null,
): { largura: number; altura: number } {
  return dimensoesDaColuna(width, height) ?? { largura: LARGURA_PADRAO, altura: ALTURA_PADRAO };
}
