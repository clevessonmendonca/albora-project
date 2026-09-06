import { describe, expect, it } from "vitest";
import { sharpnessScore } from "./nitidez";
import { blur, checkerboard, solidImage } from "./test-fixtures";

describe("sharpnessScore", () => {
  it("imagem chapada (nenhuma borda) tem nitidez zero", () => {
    expect(sharpnessScore(solidImage(16, 16, 128), 16, 16)).toBe(0);
  });

  it("imagem borrada tem nitidez menor que a mesma imagem nítida", () => {
    const width = 32;
    const height = 32;
    const nitida = checkerboard(width, height, 2);
    const borrada = blur(nitida, width, height, 2);

    expect(sharpnessScore(borrada, width, height)).toBeLessThan(
      sharpnessScore(nitida, width, height),
    );
  });

  it("imagem menor que 3x3 não tem vizinhança para o laplaciano — nitidez zero, nunca erro", () => {
    expect(sharpnessScore(solidImage(2, 2, 200), 2, 2)).toBe(0);
  });
});
