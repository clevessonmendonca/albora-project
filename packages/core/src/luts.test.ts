import { describe, expect, it } from "vitest";
import { aplicarFiltroCss, aplicarIntensidade, NEUTRO, paraFiltroCss } from "./luts";

describe("paraFiltroCss", () => {
  it("serializa neutro", () => {
    expect(paraFiltroCss(NEUTRO)).toContain("sepia(0)");
    expect(paraFiltroCss(NEUTRO)).toContain("saturate(1)");
  });
});

describe("aplicarFiltroCss", () => {
  it("neutro não muda pixels", () => {
    const dados = new Uint8ClampedArray([100, 150, 200, 255]);
    aplicarFiltroCss(dados, 1, 1, NEUTRO);
    expect([...dados]).toEqual([100, 150, 200, 255]);
  });

  it("brilho 2 dobra canais (com teto)", () => {
    const dados = new Uint8ClampedArray([40, 50, 60, 255]);
    aplicarFiltroCss(dados, 1, 1, { ...NEUTRO, brilho: 2 });
    expect(dados[0]).toBe(80);
    expect(dados[1]).toBe(100);
    expect(dados[2]).toBe(120);
  });

  it("intensidade 0 via aplicarIntensidade equivale a neutro", () => {
    const base = { sepia: 0.5, saturacao: 1.2, matiz: 10, brilho: 1.1, contraste: 1.1 };
    const dados = new Uint8ClampedArray([80, 90, 100, 255]);
    const copia = new Uint8ClampedArray(dados);
    aplicarFiltroCss(dados, 1, 1, aplicarIntensidade(base, 0));
    expect([...dados]).toEqual([...copia]);
  });
});
