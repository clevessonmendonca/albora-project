import { describe, expect, it } from "vitest";
import { momentosDoEvento, normalizarIdentityTokensMomentos, validarMomentos } from "./momentos";
import { iniciaisDoNome, opcoesDeMonograma, sanearMonograma } from "./monograma";

const padrao = [
  { id: "antes", titulo: "Antes" },
  { id: "pista", titulo: "A pista" },
];

describe("momentos do evento", () => {
  it("sem token (evento antigo) devolve os do pack", () => {
    expect(momentosDoEvento(padrao, {})).toEqual(padrao);
    expect(momentosDoEvento(padrao, null)).toEqual(padrao);
  });

  it("token inválido cai no pack, token válido vence", () => {
    expect(momentosDoEvento(padrao, { momentos: "x" })).toEqual(padrao);
    expect(momentosDoEvento(padrao, { momentos: [{ id: "m-1", titulo: "Brinde" }] })).toEqual([
      { id: "m-1", titulo: "Brinde" },
    ]);
  });

  it("sanea e valida limites", () => {
    expect(validarMomentos([{ id: "a", titulo: "  Oi   <b>você</b> " }])).toEqual({
      ok: true,
      momentos: [{ id: "a", titulo: "Oi b você /b" }],
    });
    expect(validarMomentos([]).ok).toBe(false);
    expect(validarMomentos([{ id: "a", titulo: "x".repeat(41) }]).ok).toBe(false);
    expect(validarMomentos(Array.from({ length: 13 }, (_, i) => ({ id: `m${i}`, titulo: `M${i}` }))).ok).toBe(false);
    expect(validarMomentos([{ id: "A b", titulo: "x" }]).ok).toBe(false);
    expect(validarMomentos([{ id: "a-noite", titulo: "x" }]).ok).toBe(false);
  });

  it("recusa nome repetido mesmo com caixa e acento", () => {
    expect(
      validarMomentos([
        { id: "a", titulo: "Cerimônia" },
        { id: "b", titulo: "cerimonia" },
      ]).ok,
    ).toBe(false);
  });

  it("normaliza só quando o token existe", () => {
    expect(normalizarIdentityTokensMomentos({ a: 1 })).toEqual({ ok: true, tokens: { a: 1 } });
    expect(normalizarIdentityTokensMomentos({ momentos: [] }).ok).toBe(false);
  });
});

describe("monograma", () => {
  it("deriva iniciais ignorando ligações e símbolos", () => {
    expect(iniciaisDoNome("Ana & João")).toEqual(["A", "J"]);
    expect(iniciaisDoNome("Ana e João Silva")).toEqual(["A", "J"]);
    expect(iniciaisDoNome("Formatura")).toEqual(["F"]);
    expect(iniciaisDoNome("")).toEqual([]);
  });

  it("oferece as opções e sempre o 'sem'", () => {
    expect(opcoesDeMonograma("Ana & João").map((o) => o.valor)).toEqual(["A&J", "AJ", "A + J", ""]);
    expect(opcoesDeMonograma(null).map((o) => o.valor)).toEqual([""]);
  });

  it("aceita vazio, recusa acima de 8", () => {
    expect(sanearMonograma("")).toBe("");
    expect(sanearMonograma("A&J")).toBe("A&J");
    expect(sanearMonograma("123456789")).toBeNull();
    expect(sanearMonograma(3)).toBeNull();
  });
});
