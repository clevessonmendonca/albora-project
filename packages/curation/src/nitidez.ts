import { luminanceGrid } from "./luminance";

/**
 * Variância do laplaciano sobre a luminância: borda nítida gera resposta alta (transição abrupta),
 * área borrada gera resposta baixa e uniforme (transição suave) — a variância dessas respostas
 * é o proxy clássico de foco. Maior é mais nítido.
 */
export function sharpnessScore(pixels: Uint8ClampedArray, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;

  const grid = luminanceGrid(pixels, width, height);
  const responses: number[] = [];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = grid[y * width + x] ?? 0;
      const up = grid[(y - 1) * width + x] ?? 0;
      const down = grid[(y + 1) * width + x] ?? 0;
      const left = grid[y * width + (x - 1)] ?? 0;
      const right = grid[y * width + (x + 1)] ?? 0;
      // Kernel [[0,1,0],[1,-4,1],[0,1,0]].
      responses.push(up + down + left + right - 4 * center);
    }
  }

  return variance(responses);
}

function variance(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredError = values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  return squaredError / values.length;
}
