import { describe, expect, it } from "vitest";
import { exposureScore } from "./exposicao";
import { solidImage } from "./test-fixtures";

describe("exposureScore", () => {
  it("imagem toda branca tem exposureScore alto (luz estourada)", () => {
    expect(exposureScore(solidImage(16, 16, 255), 16, 16)).toBe(1);
  });

  it("imagem toda preta tem exposureScore alto (sombra estourada)", () => {
    expect(exposureScore(solidImage(16, 16, 0), 16, 16)).toBe(1);
  });

  it("imagem de contraste médio (cinza) tem exposureScore baixo", () => {
    expect(exposureScore(solidImage(16, 16, 128), 16, 16)).toBe(0);
  });

  it("imagem sem pixels (0x0) devolve exposição zero, nunca lança erro", () => {
    expect(exposureScore(new Uint8ClampedArray(0), 0, 0)).toBe(0);
  });
});
