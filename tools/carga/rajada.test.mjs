import { describe, expect, it } from "vitest";
import { distribuirEntreConvidados, gerarRajada, janelaMaisCheia, sorteador } from "./rajada.mjs";

const VINTE_MIN = 20 * 60 * 1000;

const PADRAO = {
  total: 150,
  duracaoMs: VINTE_MIN,
  picos: 4,
  fracaoEmPico: 0.7,
  duracaoPicoMs: 45_000,
  semente: "bolo",
};

describe("sorteador", () => {
  it("é determinístico por semente", () => {
    const a = sorteador("x");
    const b = sorteador("x");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("sementes diferentes divergem", () => {
    expect(sorteador("x")()).not.toBe(sorteador("y")());
  });

  it("fica dentro de [0, 1)", () => {
    const s = sorteador("intervalo");
    for (let i = 0; i < 5_000; i += 1) {
      const v = s();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("gerarRajada", () => {
  it("devolve exatamente o total pedido", () => {
    expect(gerarRajada(PADRAO)).toHaveLength(150);
  });

  it("fecha o total mesmo quando os picos não dividem exato", () => {
    // 0,7 × 151 = 105,7 → 106 em pico, e 106 não divide por 4.
    expect(gerarRajada({ ...PADRAO, total: 151 })).toHaveLength(151);
    expect(gerarRajada({ ...PADRAO, total: 7, picos: 3 })).toHaveLength(7);
  });

  it("mantém tudo dentro da janela", () => {
    for (const t of gerarRajada(PADRAO)) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(VINTE_MIN);
    }
  });

  it("devolve ordenado", () => {
    const t = gerarRajada(PADRAO);
    expect([...t].sort((a, b) => a - b)).toEqual(t);
  });

  it("repete com a mesma semente e diverge com outra", () => {
    expect(gerarRajada(PADRAO)).toEqual(gerarRajada(PADRAO));
    expect(gerarRajada({ ...PADRAO, semente: "danca" })).not.toEqual(gerarRajada(PADRAO));
  });

  it("é rajada, não taxa constante", () => {
    // Uniforme, 45 s de 20 min renderiam ~5,6 capturas. Se o pico não for
    // muitas vezes isso, o cronograma virou fluxo e o teste perdeu o sentido.
    const { quantos } = janelaMaisCheia(gerarRajada(PADRAO), PADRAO.duracaoPicoMs);
    expect(quantos).toBeGreaterThan(20);
  });

  it("deixa vales de silêncio entre os picos", () => {
    const t = gerarRajada(PADRAO);
    let maiorVale = 0;
    for (let i = 1; i < t.length; i += 1) {
      maiorVale = Math.max(maiorVale, t[i] - t[i - 1]);
    }
    // Taxa constante daria intervalos de ~8 s. Precisa haver minuto vazio.
    expect(maiorVale).toBeGreaterThan(60_000);
  });

  it("com fracaoEmPico 0 vira fluxo uniforme — o contraste que prova o pico", () => {
    const { quantos } = janelaMaisCheia(
      gerarRajada({ ...PADRAO, fracaoEmPico: 0 }),
      PADRAO.duracaoPicoMs,
    );
    expect(quantos).toBeLessThan(20);
  });

  it("com fracaoEmPico 1 concentra tudo nos picos", () => {
    const t = gerarRajada({ ...PADRAO, fracaoEmPico: 1, picos: 1 });
    const { quantos } = janelaMaisCheia(t, PADRAO.duracaoPicoMs);
    expect(quantos).toBe(150);
  });

  it("nenhum pico escapa pela borda da janela", () => {
    const t = gerarRajada({ ...PADRAO, picos: 1, fracaoEmPico: 1, duracaoPicoMs: VINTE_MIN });
    expect(Math.min(...t)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...t)).toBeLessThanOrEqual(VINTE_MIN);
  });

  it("total zero devolve lista vazia", () => {
    expect(gerarRajada({ ...PADRAO, total: 0 })).toEqual([]);
  });

  it("recusa parâmetro inválido em vez de gerar cronograma sem sentido", () => {
    expect(() => gerarRajada({ ...PADRAO, total: -1 })).toThrow(RangeError);
    expect(() => gerarRajada({ ...PADRAO, total: 1.5 })).toThrow(RangeError);
    expect(() => gerarRajada({ ...PADRAO, duracaoMs: 0 })).toThrow(RangeError);
    expect(() => gerarRajada({ ...PADRAO, fracaoEmPico: 1.2 })).toThrow(RangeError);
    expect(() => gerarRajada({ ...PADRAO, picos: 0 })).toThrow(RangeError);
    expect(() => gerarRajada({ ...PADRAO, duracaoPicoMs: 0 })).toThrow(RangeError);
  });
});

describe("janelaMaisCheia", () => {
  it("acha a janela mais densa e onde ela começa", () => {
    expect(janelaMaisCheia([0, 1000, 2000, 50_000, 50_100, 50_200, 50_300], 1000)).toEqual({
      quantos: 4,
      comecaEm: 50_000,
    });
  });

  it("inclui a borda da janela", () => {
    expect(janelaMaisCheia([0, 1000], 1000).quantos).toBe(2);
    expect(janelaMaisCheia([0, 1001], 1000).quantos).toBe(1);
  });

  it("lista vazia não estoura", () => {
    expect(janelaMaisCheia([], 1000)).toEqual({ quantos: 0, comecaEm: 0 });
  });
});

describe("distribuirEntreConvidados", () => {
  it("dá um convidado válido para cada captura", () => {
    const donos = distribuirEntreConvidados(150, 50, "bolo");
    expect(donos).toHaveLength(150);
    for (const d of donos) {
      expect(Number.isInteger(d)).toBe(true);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThan(50);
    }
  });

  it("deixa alguém com fila de mais de uma foto", () => {
    // Sem isso o teste nunca exercita a drenagem em série de um aparelho só.
    const donos = distribuirEntreConvidados(150, 50, "bolo");
    const porConvidado = new Map();
    for (const d of donos) porConvidado.set(d, (porConvidado.get(d) ?? 0) + 1);
    expect(Math.max(...porConvidado.values())).toBeGreaterThan(1);
  });

  it("é determinístico por semente", () => {
    expect(distribuirEntreConvidados(30, 7, "a")).toEqual(distribuirEntreConvidados(30, 7, "a"));
    expect(distribuirEntreConvidados(30, 7, "a")).not.toEqual(
      distribuirEntreConvidados(30, 7, "b"),
    );
  });

  it("recusa zero convidados", () => {
    expect(() => distribuirEntreConvidados(10, 0, "a")).toThrow(RangeError);
  });
});
