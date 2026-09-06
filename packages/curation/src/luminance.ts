/** Luminância compartilhada pelos três sinais — um só lugar calculando, para hash, nitidez e exposição lerem o mesmo valor por pixel. */

/** Pesos Rec. 601 (mesma fórmula do YUV clássico): o olho é mais sensível a verde que a azul. */
const WEIGHT_RED = 0.299;
const WEIGHT_GREEN = 0.587;
const WEIGHT_BLUE = 0.114;

/** `pixels` é RGBA (4 bytes por pixel, como `ImageData.data`); `pixelIndex` é o índice do pixel (não o offset em bytes). */
export function luminanceAt(pixels: Uint8ClampedArray, pixelIndex: number): number {
  const offset = pixelIndex * 4;
  const r = pixels[offset] ?? 0;
  const g = pixels[offset + 1] ?? 0;
  const b = pixels[offset + 2] ?? 0;
  return WEIGHT_RED * r + WEIGHT_GREEN * g + WEIGHT_BLUE * b;
}

/** Grade de luminância no tamanho original da imagem, para quem precisa varrer vizinhança (nitidez) ou histograma (exposição). */
export function luminanceGrid(pixels: Uint8ClampedArray, width: number, height: number): Float64Array {
  const total = width * height;
  const grid = new Float64Array(total);
  for (let i = 0; i < total; i += 1) {
    grid[i] = luminanceAt(pixels, i);
  }
  return grid;
}
