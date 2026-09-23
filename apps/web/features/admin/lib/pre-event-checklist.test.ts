import { describe, expect, it } from "vitest";
import {
  buildPreEventSections,
  estadoDoChecklist,
  ITENS_DERIVADOS,
  type SinaisDePreparo,
} from "./pre-event-checklist";

const nada: SinaisDePreparo = {
  missoes: 0,
  temIdentidade: false,
  convidadosEsperados: 0,
  planoPago: false,
  gateDefinido: false,
};

const tudo: SinaisDePreparo = {
  missoes: 8,
  temIdentidade: true,
  convidadosEsperados: 80,
  planoPago: true,
  gateDefinido: true,
};

describe("itens derivados", () => {
  it("são cinco, e todos existem no checklist de verdade", () => {
    const chaves = buildPreEventSections("abc", "https://exemplo.test")
      .flatMap((s) => s.items)
      .map((i) => i.id);

    expect(Object.keys(ITENS_DERIVADOS)).toHaveLength(5);
    for (const chave of Object.keys(ITENS_DERIVADOS)) {
      expect(chaves).toContain(chave);
    }
  });
});

describe("estado do checklist", () => {
  it("item derivado aparece feito sem ninguém marcar", () => {
    const estado = estadoDoChecklist([], tudo);

    expect(estado.missoes).toEqual({ feito: true, derivado: true });
    expect(estado.identidade?.feito).toBe(true);
    expect(estado.plano?.feito).toBe(true);
  });

  it("item derivado pendente não mente dizendo que está feito", () => {
    const estado = estadoDoChecklist([], nada);

    expect(estado.missoes).toEqual({ feito: false, derivado: true });
  });

  it("marcar à mão não sobrepõe o que o sistema vê", () => {
    const estado = estadoDoChecklist(["missoes"], nada);

    expect(estado.missoes).toEqual({ feito: false, derivado: true });
  });

  it("item manual só fica feito se o servidor disser", () => {
    const estado = estadoDoChecklist(["prova-qr"], tudo);

    expect(estado["prova-qr"]).toEqual({ feito: true, derivado: false });
    expect(estado.telao).toEqual({ feito: false, derivado: false });
  });

  it("cobre todo item do checklist, nenhum fica sem estado", () => {
    const chaves = buildPreEventSections("abc", "https://exemplo.test")
      .flatMap((s) => s.items)
      .map((i) => i.id);
    const estado = estadoDoChecklist([], nada);

    for (const chave of chaves) {
      expect(estado[chave]).toBeDefined();
    }
  });

  it("chave desconhecida vinda do servidor é ignorada, não vira item fantasma", () => {
    const estado = estadoDoChecklist(["item-que-nao-existe-mais"], nada);

    expect(estado["item-que-nao-existe-mais"]).toBeUndefined();
  });
});
