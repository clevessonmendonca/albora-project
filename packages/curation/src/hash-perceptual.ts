import { luminanceAt } from "./luminance";

/** aHash: reduz a imagem a uma grade 8x8 de luminância média e marca cada célula acima/abaixo da média geral. Robusto a recompressão e pequeno recorte — é o que faz rajada de fotos quase idênticas colapsar no mesmo hash. */
const GRID_SIZE = 8;
const HASH_BITS = GRID_SIZE * GRID_SIZE;
const HEX_DIGITS = HASH_BITS / 4;

/**
 * Devolve o hash como string hex (64 bits, 16 dígitos), nunca `bigint`/`number`: a coluna no banco é
 * `text` porque `bigint` do Postgres é assinado e o hash usa os 64 bits inteiros.
 */
export function perceptualHash(pixels: Uint8ClampedArray, width: number, height: number): string {
  if (width <= 0 || height <= 0) return "0".repeat(HEX_DIGITS);

  const grid = reduceToGrid(pixels, width, height, GRID_SIZE);
  const mean = grid.reduce((sum, v) => sum + v, 0) / grid.length;

  let hash = 0n;
  for (const value of grid) {
    hash <<= 1n;
    if (value >= mean) hash |= 1n;
  }

  return hash.toString(16).padStart(HEX_DIGITS, "0");
}

/** Número de bits que diferem entre dois hashes — quanto menor, mais parecidas as imagens de origem. */
export function hammingDistance(a: string, b: string): number {
  let xored = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let distance = 0;
  while (xored > 0n) {
    distance += Number(xored & 1n);
    xored >>= 1n;
  }
  return distance;
}

/** Reduz a imagem a uma grade `size`x`size` de luminância média por célula, por varredura de bloco (sem redimensionamento bilinear — aHash não precisa da suavização extra). */
function reduceToGrid(pixels: Uint8ClampedArray, width: number, height: number, size: number): number[] {
  const sums = new Array<number>(size * size).fill(0);
  const counts = new Array<number>(size * size).fill(0);

  for (let y = 0; y < height; y += 1) {
    const gy = Math.min(size - 1, Math.floor((y * size) / height));
    for (let x = 0; x < width; x += 1) {
      const gx = Math.min(size - 1, Math.floor((x * size) / width));
      const cell = gy * size + gx;
      sums[cell] = (sums[cell] ?? 0) + luminanceAt(pixels, y * width + x);
      counts[cell] = (counts[cell] ?? 0) + 1;
    }
  }

  return sums.map((sum, i) => sum / Math.max(1, counts[i] ?? 0));
}
