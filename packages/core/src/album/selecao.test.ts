import { describe, expect, it } from "vitest";
import { ordemNaRajada, ordemDeDescarte, selecionarParaAlbum } from "./selecao";
import { CAPITULO_UNICO } from "./tempo";
import { JANELA_DE_RAJADA_MS } from "./types";
import type { MidiaResolvida, PlanoDoAlbum } from "./types";

function resolvida(overrides: Partial<MidiaResolvida> = {}): MidiaResolvida {
  return {
    id: "m1",
    sessaoId: "s1",
    capturadaEm: new Date("2026-09-01T23:00:00Z"),
    recebidaEm: new Date("2026-09-01T23:01:00Z"),
    largura: 1080,
    altura: 1920,
    lugarId: null,
    missaoId: null,
    reacoes: 0,
    em: new Date("2026-09-01T23:00:00Z"),
    horaConfiavel: true,
    capituloId: CAPITULO_UNICO,
    inicioDaHora: new Date("2026-09-01T23:00:00Z"),
    hora: 20,
    amanhecer: false,
    ...overrides,
  };
}

const PLANO: PlanoDoAlbum = {
  janela: {
    comecaEm: new Date("2026-09-01T21:00:00Z"),
    terminaEm: new Date("2026-09-02T05:00:00Z"),
    offsetMinutos: -180,
  },
  capitulos: [],
  tetoDePaginas: 80,
};

describe("ordemNaRajada", () => {
  it("índice 0 para primeira foto da sessão", () => {
    const midias = [resolvida({ id: "m1" })];
    const ordem = ordemNaRajada(midias);
    expect(ordem.get("m1")).toBe(0);
  });

  it("incrementa índice para fotos dentro da janela de rajada", () => {
    const base = new Date("2026-09-01T23:00:00Z").getTime();
    const midias = [
      resolvida({ id: "m1", em: new Date(base) }),
      resolvida({ id: "m2", em: new Date(base + 30_000) }),
      resolvida({ id: "m3", em: new Date(base + 60_000) }),
    ];
    const ordem = ordemNaRajada(midias);
    expect(ordem.get("m1")).toBe(0);
    expect(ordem.get("m2")).toBe(1);
    expect(ordem.get("m3")).toBe(2);
  });

  it("reseta índice quando intervalo excede janela de rajada", () => {
    const base = new Date("2026-09-01T23:00:00Z").getTime();
    const midias = [
      resolvida({ id: "m1", em: new Date(base) }),
      resolvida({ id: "m2", em: new Date(base + JANELA_DE_RAJADA_MS + 1) }),
    ];
    const ordem = ordemNaRajada(midias);
    expect(ordem.get("m1")).toBe(0);
    expect(ordem.get("m2")).toBe(0);
  });

  it("conta rajadas por sessão separadamente", () => {
    const base = new Date("2026-09-01T23:00:00Z").getTime();
    const midias = [
      resolvida({ id: "m1", sessaoId: "s1", em: new Date(base) }),
      resolvida({ id: "m2", sessaoId: "s1", em: new Date(base + 30_000) }),
      resolvida({ id: "m3", sessaoId: "s2", em: new Date(base + 30_000) }),
    ];
    const ordem = ordemNaRajada(midias);
    expect(ordem.get("m2")).toBe(1);
    expect(ordem.get("m3")).toBe(0);
  });
});

describe("ordemDeDescarte", () => {
  it("fotos com maior índice de rajada vêm primeiro", () => {
    const base = new Date("2026-09-01T23:00:00Z").getTime();
    const midias = [
      resolvida({ id: "m1", em: new Date(base), reacoes: 0 }),
      resolvida({ id: "m2", em: new Date(base + 30_000), reacoes: 0 }),
    ];
    const ordenada = ordemDeDescarte(midias);
    expect(ordenada[0]!.id).toBe("m2");
  });

  it("desempata por reações (menos reações primeiro)", () => {
    const midias = [
      resolvida({ id: "m1", reacoes: 5 }),
      resolvida({ id: "m2", reacoes: 1 }),
    ];
    const ordenada = ordemDeDescarte(midias);
    expect(ordenada[0]!.id).toBe("m2");
  });

  it("desempata final por id ascendente", () => {
    const base = new Date("2026-09-01T23:00:00Z").getTime();
    const midias = [
      resolvida({ id: "mb", sessaoId: "s1", em: new Date(base), reacoes: 0 }),
      resolvida({ id: "ma", sessaoId: "s2", em: new Date(base), reacoes: 0 }),
    ];
    const ordenada = ordemDeDescarte(midias);
    expect(ordenada[0]!.id).toBe("ma");
  });
});

describe("selecionarParaAlbum", () => {
  it("mantém todas quando dentro do teto", () => {
    const midias = [
      resolvida({ id: "m1" }),
      resolvida({ id: "m2" }),
    ];
    const resultado = selecionarParaAlbum(midias, PLANO);
    expect(resultado.mantidas).toHaveLength(2);
    expect(resultado.descartadas).toHaveLength(0);
  });

  it("descarta quando excede teto de páginas", () => {
    const plano = { ...PLANO, tetoDePaginas: 1 };
    const midias = Array.from({ length: 5 }, (_, i) =>
      resolvida({
        id: `m${i}`,
        sessaoId: "s1",
        largura: 1080,
        altura: 1920,
      }),
    );
    const resultado = selecionarParaAlbum(midias, plano);
    expect(resultado.descartadas.length).toBeGreaterThan(0);
    expect(resultado.mantidas.length + resultado.descartadas.length).toBe(5);
  });

  it("lista vazia retorna seleção vazia", () => {
    const resultado = selecionarParaAlbum([], PLANO);
    expect(resultado.mantidas).toHaveLength(0);
    expect(resultado.descartadas).toHaveLength(0);
  });

  it("preserva pelo menos uma foto por capítulo quando possível", () => {
    const plano = { ...PLANO, tetoDePaginas: 2 };
    const midias = [
      resolvida({ id: "m1", capituloId: "cerimonia", sessaoId: "s1" }),
      resolvida({ id: "m2", capituloId: "cerimonia", sessaoId: "s1" }),
      resolvida({ id: "m3", capituloId: "festa", sessaoId: "s1" }),
      resolvida({ id: "m4", capituloId: "festa", sessaoId: "s1" }),
    ];
    const resultado = selecionarParaAlbum(midias, plano);
    const capitulosMantidos = new Set(resultado.mantidas.map((m) => m.capituloId));
    expect(capitulosMantidos.has("cerimonia")).toBe(true);
    expect(capitulosMantidos.has("festa")).toBe(true);
  });
});
