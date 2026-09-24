import { describe, expect, it } from "vitest";
import {
  buildPreEventSections,
  ehItemManualDoChecklist,
  estadoDoChecklist,
  ITENS_DERIVADOS,
  type SinaisDePreparo,
} from "./pre-event-checklist";

const nada: SinaisDePreparo = {
  missoes: 0,
  convidadosEsperados: 0,
  planoPago: false,
  gateDefinido: false,
};

const tudo: SinaisDePreparo = {
  missoes: 8,
  convidadosEsperados: 80,
  planoPago: true,
  gateDefinido: true,
};

const chaves = () =>
  buildPreEventSections("abc", "https://exemplo.test")
    .flatMap((s) => s.items)
    .map((i) => i.id);

describe("itens deriváveis", () => {
  it("todos existem no checklist de verdade", () => {
    for (const chave of Object.keys(ITENS_DERIVADOS)) {
      expect(chaves()).toContain(chave);
    }
  });

  it("identidade não é derivada aqui: já é marco de preparo (0074)", () => {
    expect(ITENS_DERIVADOS["identidade"]).toBeUndefined();
  });

  it("menores não é derivado: o item é 'se aplicável', e só o casal sabe", () => {
    expect(ITENS_DERIVADOS["menores"]).toBeUndefined();
  });
});

describe("estado do checklist", () => {
  it("item derivado aparece feito sem ninguém marcar", () => {
    const estado = estadoDoChecklist({}, tudo);

    expect(estado["missoes"]).toEqual({ feito: true, derivado: true });
    expect(estado["plano"]?.feito).toBe(true);
  });

  it("item derivado pendente não mente dizendo que está feito", () => {
    expect(estadoDoChecklist({}, nada)["missoes"]).toEqual({ feito: false, derivado: true });
  });

  it("marcar à mão não sobrepõe o que o sistema vê", () => {
    expect(estadoDoChecklist({ missoes: true }, nada)["missoes"]?.feito).toBe(false);
  });

  it("item manual só fica feito se o servidor disser", () => {
    const estado = estadoDoChecklist({ "prova-qr": true }, tudo);

    expect(estado["prova-qr"]).toEqual({ feito: true, derivado: false });
    expect(estado["telao"]).toEqual({ feito: false, derivado: false });
  });

  it("cobre todo item do checklist, nenhum fica sem estado", () => {
    const estado = estadoDoChecklist({}, nada);

    for (const chave of chaves()) {
      expect(estado[chave]).toBeDefined();
    }
  });

  it("chave desconhecida vinda do servidor é ignorada, não vira item fantasma", () => {
    expect(estadoDoChecklist({ "nao-existe-mais": true }, nada)["nao-existe-mais"]).toBeUndefined();
  });
});

describe("o que pode ser gravado", () => {
  it("item manual, sim", () => {
    expect(ehItemManualDoChecklist("prova-qr")).toBe(true);
  });

  it("item derivado, não: é calculado, nunca gravado", () => {
    expect(ehItemManualDoChecklist("missoes")).toBe(false);
  });

  it("chave inventada, não", () => {
    expect(ehItemManualDoChecklist("../../etc/passwd")).toBe(false);
  });
});
