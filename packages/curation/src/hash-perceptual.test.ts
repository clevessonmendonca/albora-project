import { describe, expect, it } from "vitest";
import { hammingDistance, perceptualHash } from "./hash-perceptual";
import { checkerboard, gradientImage, solidImage } from "./test-fixtures";

describe("perceptualHash", () => {
  it("devolve string hex de 16 dígitos (64 bits) — nunca bigint/number, a coluna no banco é text", () => {
    const hash = perceptualHash(gradientImage(32, 32), 32, 32);
    expect(typeof hash).toBe("string");
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("duas cópias da mesma imagem têm distância de Hamming zero", () => {
    const a = perceptualHash(gradientImage(32, 32), 32, 32);
    const b = perceptualHash(gradientImage(32, 32), 32, 32);
    expect(hammingDistance(a, b)).toBe(0);
  });

  it("imagem chapada branca e imagem chapada preta colapsam no mesmo hash (distância zero)", () => {
    // aHash marca cada célula acima/abaixo da média da própria imagem — numa chapada, toda célula
    // empata com a média e o bit fica travado em 1 dos dois lados, então branco e preto ficam
    // indistinguíveis por estrutura. Não é bug: aHash mede estrutura, não exposição — por isso
    // exposição é um sinal separado (`exposicao.ts`).
    const branco = perceptualHash(solidImage(32, 32, 255), 32, 32);
    const preto = perceptualHash(solidImage(32, 32, 0), 32, 32);
    expect(hammingDistance(branco, preto)).toBe(0);
  });

  it("estruturas bem diferentes (xadrez vs. gradiente) têm distância de Hamming maior que zero", () => {
    const xadrez = perceptualHash(checkerboard(32, 32, 4), 32, 32);
    const gradiente = perceptualHash(gradientImage(32, 32), 32, 32);
    expect(hammingDistance(xadrez, gradiente)).toBeGreaterThan(0);
  });

  it("imagem sem pixels (0x0) devolve hash neutro, nunca lança erro", () => {
    expect(perceptualHash(new Uint8ClampedArray(0), 0, 0)).toBe("0".repeat(16));
  });
});

describe("hammingDistance", () => {
  it("é zero para hashes idênticos", () => {
    expect(hammingDistance("0000000000000000", "0000000000000000")).toBe(0);
  });

  it("conta bits diferentes corretamente", () => {
    expect(hammingDistance("0000000000000000", "ffffffffffffffff")).toBe(64);
    expect(hammingDistance("f000000000000000", "0000000000000000")).toBe(4);
    expect(hammingDistance("0000000000000000", "0000000000000001")).toBe(1);
  });
});
