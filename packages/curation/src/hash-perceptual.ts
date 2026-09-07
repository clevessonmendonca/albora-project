import { luminanceAt } from "./luminance";

/** aHash: reduz a imagem a uma grade 8x8 de luminância média e marca cada célula acima/abaixo da média geral. Robusto a recompressão e pequeno recorte — é o que faz rajada de fotos quase idênticas colapsar no mesmo hash. */
const GRID_SIZE = 8;
/** Exportado para `ranking.ts` (agrupamento por bucket, achado 6 do review) — uma só fonte da verdade para "o hash tem 64 bits". */
export const HASH_BITS = GRID_SIZE * GRID_SIZE;
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

/**
 * Número de bits que diferem entre dois hashes — quanto menor, mais parecidas as imagens de
 * origem. Assume os 16 dígitos hex (64 bits) que `perceptualHash` sempre produz — não genérico
 * para hash de outro tamanho.
 *
 * Reescrito no achado 6 do review: a versão anterior fazia `BigInt` + laço bit a bit (64 iterações
 * de shift em BigInt, caro por chamada). Aqui cada metade de 32 bits vira `number` (`parseInt` com
 * `>>> 0` pra tratar como inteiro sem sinal) e o popcount usa o truque SWAR clássico — só operações
 * de inteiro de 32 bits, sem alocar `BigInt`. `groupDuplicates` (`ranking.ts`) chama isto por par
 * candidato depois de reduzir todos-contra-todos a buckets, então o custo por chamada aqui conta
 * tanto quanto o número de chamadas.
 */
export function hammingDistance(a: string, b: string): number {
  const highXor = (parseInt(a.slice(0, 8), 16) ^ parseInt(b.slice(0, 8), 16)) >>> 0;
  const lowXor = (parseInt(a.slice(8, 16), 16) ^ parseInt(b.slice(8, 16), 16)) >>> 0;
  return popcount32(highXor) + popcount32(lowXor);
}

/** Popcount SWAR (contagem de bits 1) para inteiro de 32 bits sem sinal. */
function popcount32(nUnsigned: number): number {
  let x = nUnsigned >>> 0;
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  return (x * 0x01010101) >>> 24;
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
