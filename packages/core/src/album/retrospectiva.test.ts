import { describe, expect, it } from "vitest";
import { montarRetrospectiva, POR_MOMENTO } from "./retrospectiva";
import { CAPITULO_UNICO } from "./types";
import type { MidiaResolvida } from "./types";

const EM = (iso: string) => new Date(iso);

function midia(parcial: Partial<MidiaResolvida> & { id: string }): MidiaResolvida {
  return {
    sessaoId: "s1",
    capturadaEm: null,
    recebidaEm: EM("2026-06-01T23:00:00Z"),
    largura: 1080,
    altura: 1920,
    lugarId: null,
    missaoId: null,
    reacoes: 0,
    em: EM("2026-06-01T23:00:00Z"),
    horaConfiavel: true,
    capituloId: "cap-1",
    inicioDaHora: EM("2026-06-01T23:00:00Z"),
    hora: 20,
    amanhecer: false,
    ...parcial,
  };
}

describe("montar a retrospectiva", () => {
  it("sem foto nenhuma, não inventa retrospectiva", () => {
    const r = montarRetrospectiva([]);

    expect(r.capitulos).toEqual([]);
    expect(r.total).toBe(0);
  });

  it("mostra no máximo três por momento", () => {
    const muitas = Array.from({ length: 10 }, (_, i) =>
      midia({ id: `f${i}`, sessaoId: `s${i}`, reacoes: 10 - i }),
    );

    const r = montarRetrospectiva(muitas);

    expect(POR_MOMENTO).toBe(3);
    expect(r.capitulos[0]?.midias).toHaveLength(3);
  });

  it("destaque do casal vem antes de reação de convidado", () => {
    const r = montarRetrospectiva([
      midia({ id: "muito-curtida", sessaoId: "a", reacoes: 50 }),
      midia({ id: "destacada", sessaoId: "b", reacoes: 0, destacada: true }),
    ]);

    expect(r.capitulos[0]?.midias[0]?.id).toBe("destacada");
  });

  it("entre não destacadas, mais reagida primeiro", () => {
    const r = montarRetrospectiva([
      midia({ id: "pouca", sessaoId: "a", reacoes: 2 }),
      midia({ id: "muita", sessaoId: "b", reacoes: 30 }),
    ]);

    expect(r.capitulos[0]?.midias[0]?.id).toBe("muita");
  });

  it("não deixa uma pessoa só ocupar o momento inteiro", () => {
    const r = montarRetrospectiva([
      midia({ id: "a1", sessaoId: "mesma", reacoes: 90 }),
      midia({ id: "a2", sessaoId: "mesma", reacoes: 80 }),
      midia({ id: "a3", sessaoId: "mesma", reacoes: 70 }),
      midia({ id: "b1", sessaoId: "outra", reacoes: 1 }),
    ]);

    const sessoes = r.capitulos[0]?.midias.map((m) => m.sessaoId) ?? [];
    expect(sessoes.filter((s) => s === "mesma").length).toBeLessThanOrEqual(2);
    expect(sessoes).toContain("outra");
  });

  it("mas se só uma pessoa fotografou, mostra as dela em vez de deixar buraco", () => {
    const r = montarRetrospectiva([
      midia({ id: "a1", sessaoId: "sozinha", reacoes: 9 }),
      midia({ id: "a2", sessaoId: "sozinha", reacoes: 8 }),
      midia({ id: "a3", sessaoId: "sozinha", reacoes: 7 }),
    ]);

    expect(r.capitulos[0]?.midias).toHaveLength(3);
  });

  it("os capítulos saem em ordem cronológica, não por curadoria", () => {
    const r = montarRetrospectiva([
      midia({ id: "tarde", capituloId: "cap-2", em: EM("2026-06-02T02:00:00Z"), reacoes: 1 }),
      midia({ id: "cedo", capituloId: "cap-1", em: EM("2026-06-01T21:00:00Z"), reacoes: 99 }),
    ]);

    expect(r.capitulos.map((c) => c.id)).toEqual(["cap-1", "cap-2"]);
  });

  it("um momento só não é retrospectiva: diz que virou sequência única", () => {
    const r = montarRetrospectiva([
      midia({ id: "a", capituloId: "cap-1", sessaoId: "x" }),
      midia({ id: "b", capituloId: "cap-1", sessaoId: "y" }),
    ]);

    expect(r.sequenciaUnica).toBe(true);
    expect(r.capitulos[0]?.id).toBe(CAPITULO_UNICO);
  });

  it("dois momentos ou mais viram capítulos de verdade", () => {
    const r = montarRetrospectiva([
      midia({ id: "a", capituloId: "cap-1" }),
      midia({ id: "b", capituloId: "cap-2", em: EM("2026-06-02T01:00:00Z") }),
    ]);

    expect(r.sequenciaUnica).toBe(false);
    expect(r.capitulos).toHaveLength(2);
  });

  it("conta quantas fotos entraram, não quantas existiam", () => {
    const muitas = Array.from({ length: 12 }, (_, i) =>
      midia({ id: `f${i}`, sessaoId: `s${i}`, capituloId: i < 6 ? "cap-1" : "cap-2" }),
    );

    const r = montarRetrospectiva(muitas);

    expect(r.total).toBe(6);
  });
});
