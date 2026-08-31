import { describe, expect, it } from "vitest";
import { contarPorCodigo, percentil, resumo } from "./percentis.mjs";

describe("percentil", () => {
  const cem = Array.from({ length: 100 }, (_, i) => i + 1);

  it("usa posto, não interpolação", () => {
    expect(percentil(cem, 50)).toBe(50);
    expect(percentil(cem, 95)).toBe(95);
    expect(percentil(cem, 99)).toBe(99);
    expect(percentil(cem, 100)).toBe(100);
  });

  it("devolve sempre um valor observado", () => {
    const observados = [10, 20, 30];
    for (const p of [0, 1, 33, 50, 66, 95, 99, 100]) {
      expect(observados).toContain(percentil(observados, p));
    }
  });

  it("p0 é o menor e p100 é o maior", () => {
    expect(percentil(cem, 0)).toBe(1);
    expect(percentil(cem, 100)).toBe(100);
  });

  it("com uma amostra só, todo percentil é ela", () => {
    expect(percentil([42], 50)).toBe(42);
    expect(percentil([42], 99)).toBe(42);
    expect(percentil([42], 0)).toBe(42);
  });

  it("sem amostra devolve null em vez de zero", () => {
    // Zero seria lido como "rápido"; null é lido como "não medimos".
    expect(percentil([], 95)).toBeNull();
  });

  it("recusa percentil fora de 0..100", () => {
    expect(() => percentil(cem, 101)).toThrow(RangeError);
    expect(() => percentil(cem, -1)).toThrow(RangeError);
    expect(() => percentil(cem, Number.NaN)).toThrow(RangeError);
  });
});

describe("resumo", () => {
  it("ordena antes de calcular", () => {
    const r = resumo([300, 10, 50, 20]);
    expect(r.min).toBe(10);
    expect(r.max).toBe(300);
    expect(r.p50).toBe(20);
  });

  it("não muta a lista recebida", () => {
    const original = [3, 1, 2];
    resumo(original);
    expect(original).toEqual([3, 1, 2]);
  });

  it("descarta valores não finitos em vez de contaminar a média", () => {
    const r = resumo([10, Number.NaN, 20, Number.POSITIVE_INFINITY]);
    expect(r.n).toBe(2);
    expect(r.media).toBe(15);
  });

  it("lista vazia devolve n zero e percentis nulos", () => {
    expect(resumo([])).toEqual({
      n: 0,
      min: null,
      p50: null,
      p95: null,
      p99: null,
      max: null,
      media: null,
    });
  });

  it("uma cauda longa não desaparece na média", () => {
    const r = resumo([...Array.from({ length: 99 }, () => 100), 30_000]);
    expect(r.p50).toBe(100);
    expect(r.max).toBe(30_000);
    expect(r.media).toBeLessThan(500);
  });
});

describe("contarPorCodigo", () => {
  it("separa 429 de 500", () => {
    const contagem = contarPorCodigo([
      { status: 429, codigo: "limite.excedido" },
      { status: 429, codigo: "limite.excedido" },
      { status: 500, codigo: "erro.interno" },
    ]);
    expect(contagem).toEqual({ "429 limite.excedido": 2, "500 erro.interno": 1 });
  });

  it("sem código, agrupa só pelo status", () => {
    expect(contarPorCodigo([{ status: 503, codigo: null }])).toEqual({ 503: 1 });
  });

  it("sem falha, devolve objeto vazio", () => {
    expect(contarPorCodigo([])).toEqual({});
  });
});
