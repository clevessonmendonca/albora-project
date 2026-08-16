/**
 * Par de dimensões persistido em `uploads.width` / `uploads.height`.
 *
 * Um lado só não serve: misturar largura real com altura padrão vira paisagem
 * no slot de retrato e corta cabeça. Ausente — fila antiga, decoder mudo —
 * quem lê decide o fallback. O álbum assume retrato; feed e parede omitem e
 * medem no cliente.
 */

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
