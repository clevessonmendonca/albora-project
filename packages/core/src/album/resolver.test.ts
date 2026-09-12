import { describe, expect, it } from "vitest";
import { compararCronologicamente, resolver } from "./resolver";
import { CAPITULO_CONFESSIONARIO, CAPITULO_SEM_HORA, CAPITULO_UNICO } from "./tempo";
import type { MidiaDoAlbum, PlanoDoAlbum, MidiaResolvida } from "./types";

function midia(overrides: Partial<MidiaDoAlbum> = {}): MidiaDoAlbum {
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
    ...overrides,
  };
}

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

describe("compararCronologicamente", () => {
  it("ordena por tempo crescente", () => {
    const a = resolvida({ id: "m1", em: new Date("2026-09-01T23:00:00Z") });
    const b = resolvida({ id: "m2", em: new Date("2026-09-02T01:00:00Z") });
    expect(compararCronologicamente(a, b)).toBeLessThan(0);
    expect(compararCronologicamente(b, a)).toBeGreaterThan(0);
  });

  it("desempata por id ascendente", () => {
    const em = new Date("2026-09-01T23:00:00Z");
    const a = resolvida({ id: "ma", em });
    const b = resolvida({ id: "mb", em });
    expect(compararCronologicamente(a, b)).toBeLessThan(0);
    expect(compararCronologicamente(b, a)).toBeGreaterThan(0);
  });

  it("retorna 0 para mesma mídia", () => {
    const a = resolvida({ id: "m1", em: new Date("2026-09-01T23:00:00Z") });
    expect(compararCronologicamente(a, a)).toBe(0);
  });
});

describe("resolver", () => {
  it("retorna array vazio para entrada vazia", () => {
    expect(resolver([], PLANO)).toHaveLength(0);
  });

  it("usa capturadaEm quando dentro da janela", () => {
    const capturadaEm = new Date("2026-09-01T23:30:00Z");
    const m = midia({ capturadaEm, recebidaEm: new Date("2026-09-01T23:31:00Z") });
    const [r] = resolver([m], PLANO);
    expect(r!.em).toEqual(capturadaEm);
    expect(r!.horaConfiavel).toBe(true);
  });

  it("usa recebidaEm quando capturadaEm fora da janela", () => {
    const recebidaEm = new Date("2026-09-01T23:30:00Z");
    const m = midia({
      capturadaEm: new Date("2020-01-01T00:00:00Z"),
      recebidaEm,
    });
    const [r] = resolver([m], PLANO);
    expect(r!.em).toEqual(recebidaEm);
    expect(r!.horaConfiavel).toBe(true);
  });

  it("marca horaConfiavel false quando nenhum instante está na janela", () => {
    const m = midia({
      capturadaEm: new Date("2020-01-01T00:00:00Z"),
      recebidaEm: new Date("2020-01-01T00:01:00Z"),
    });
    const [r] = resolver([m], PLANO);
    expect(r!.horaConfiavel).toBe(false);
    expect(r!.capituloId).toBe(CAPITULO_SEM_HORA);
    expect(r!.inicioDaHora).toBeNull();
    expect(r!.hora).toBeNull();
  });

  it("atribui capítulo confessionário quando promptKey presente", () => {
    const m = midia({ promptKey: "confessionario.pergunta1" });
    const [r] = resolver([m], PLANO);
    expect(r!.capituloId).toBe(CAPITULO_CONFESSIONARIO);
  });

  it("atribui capítulo confessionário mesmo com hora confiável", () => {
    const m = midia({
      capturadaEm: new Date("2026-09-01T23:30:00Z"),
      promptKey: "confessionario.x",
    });
    const [r] = resolver([m], PLANO);
    expect(r!.capituloId).toBe(CAPITULO_CONFESSIONARIO);
    expect(r!.horaConfiavel).toBe(true);
  });

  it("não trata promptKey vazia como confessionário", () => {
    const m = midia({ promptKey: "" });
    const [r] = resolver([m], PLANO);
    expect(r!.capituloId).not.toBe(CAPITULO_CONFESSIONARIO);
  });

  it("não trata promptKey null como confessionário", () => {
    const m = midia({ promptKey: null });
    const [r] = resolver([m], PLANO);
    expect(r!.capituloId).not.toBe(CAPITULO_CONFESSIONARIO);
  });

  it("atribui capítulo por horário quando capítulos definidos", () => {
    const plano: PlanoDoAlbum = {
      ...PLANO,
      capitulos: [
        { id: "cerimonia", comecaEm: new Date("2026-09-01T20:00:00Z") },
        { id: "festa", comecaEm: new Date("2026-09-01T23:00:00Z") },
      ],
    };
    const m = midia({ capturadaEm: new Date("2026-09-01T23:30:00Z") });
    const [r] = resolver([m], plano);
    expect(r!.capituloId).toBe("festa");
  });

  it("ordena resultado cronologicamente", () => {
    const midias = [
      midia({ id: "m3", capturadaEm: new Date("2026-09-02T02:00:00Z"), recebidaEm: new Date("2026-09-02T02:01:00Z") }),
      midia({ id: "m1", capturadaEm: new Date("2026-09-01T22:00:00Z"), recebidaEm: new Date("2026-09-01T22:01:00Z") }),
      midia({ id: "m2", capturadaEm: new Date("2026-09-02T00:00:00Z"), recebidaEm: new Date("2026-09-02T00:01:00Z") }),
    ];
    const resultado = resolver(midias, PLANO);
    expect(resultado.map((r) => r.id)).toEqual(["m1", "m2", "m3"]);
  });

  it("propaga campos originais da mídia", () => {
    const m = midia({
      id: "foto-1",
      sessaoId: "sessao-abc",
      largura: 1920,
      altura: 1080,
      lugarId: "jardim",
      missaoId: "missao-1",
      reacoes: 5,
    });
    const [r] = resolver([m], PLANO);
    expect(r!.id).toBe("foto-1");
    expect(r!.sessaoId).toBe("sessao-abc");
    expect(r!.largura).toBe(1920);
    expect(r!.altura).toBe(1080);
    expect(r!.lugarId).toBe("jardim");
    expect(r!.missaoId).toBe("missao-1");
    expect(r!.reacoes).toBe(5);
  });

  it("calcula hora e amanhecer para instante confiável", () => {
    const planoLargo: PlanoDoAlbum = {
      ...PLANO,
      janela: {
        comecaEm: new Date("2026-09-01T21:00:00Z"),
        terminaEm: new Date("2026-09-02T12:00:00Z"),
        offsetMinutos: -180,
      },
    };
    const m = midia({
      capturadaEm: new Date("2026-09-02T08:30:00Z"),
      recebidaEm: new Date("2026-09-02T08:31:00Z"),
    });
    const [r] = resolver([m], planoLargo);
    expect(r!.horaConfiavel).toBe(true);
    expect(r!.hora).toBe(5);
    expect(r!.amanhecer).toBe(true);
  });

  it("não é amanhecer fora do intervalo de amanhecer", () => {
    const m = midia({
      capturadaEm: new Date("2026-09-01T23:00:00Z"),
      recebidaEm: new Date("2026-09-01T23:01:00Z"),
    });
    const [r] = resolver([m], PLANO);
    expect(r!.amanhecer).toBe(false);
  });
});
