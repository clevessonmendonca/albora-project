/**
 * Geradores de imagem sintética para os testes dos três sinais — nada de arquivo binário no repo,
 * as imagens nascem em código para o teste poder dizer exatamente o que está medindo.
 */

function alloc(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(Math.max(0, width) * Math.max(0, height) * 4);
}

function setPixel(pixels: Uint8ClampedArray, index: number, value: number): void {
  const offset = index * 4;
  pixels[offset] = value;
  pixels[offset + 1] = value;
  pixels[offset + 2] = value;
  pixels[offset + 3] = 255;
}

/** Imagem chapada: um só valor de cinza em todo pixel. */
export function solidImage(width: number, height: number, value: number): Uint8ClampedArray {
  const pixels = alloc(width, height);
  for (let i = 0; i < width * height; i += 1) setPixel(pixels, i, value);
  return pixels;
}

/** Gradiente horizontal de preto a branco — baixa frequência, sem borda abrupta nenhuma. */
export function gradientImage(width: number, height: number): Uint8ClampedArray {
  const pixels = alloc(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = Math.round((x / Math.max(1, width - 1)) * 255);
      setPixel(pixels, y * width + x, value);
    }
  }
  return pixels;
}

/** Xadrez de alto contraste — cada troca de bloco é uma borda abrupta, o caso favorável ao laplaciano. */
export function checkerboard(width: number, height: number, blockSize: number): Uint8ClampedArray {
  const pixels = alloc(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isLight = (Math.floor(x / blockSize) + Math.floor(y / blockSize)) % 2 === 0;
      setPixel(pixels, y * width + x, isLight ? 255 : 0);
    }
  }
  return pixels;
}

/** Média móvel (box blur) — suaviza as bordas do xadrez para simular foto tremida/fora de foco. */
export function blur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): Uint8ClampedArray {
  const out = alloc(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          sum += pixels[(ny * width + nx) * 4] ?? 0;
          count += 1;
        }
      }
      setPixel(out, y * width + x, Math.round(sum / Math.max(1, count)));
    }
  }
  return out;
}
