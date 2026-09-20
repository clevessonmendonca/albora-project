import { describe, expect, it } from "vitest";
import {
  proporcaoDe,
  slotAceita,
  slotCorta,
  LAYOUTS,
  LAYOUT_DE_UMA,
  MAIOR_LAYOUT,
  layoutsQueCabem,
  escolherLayout,
} from "./slots";
import type { Slot } from "./types";

function midia(largura: number, altura: number) {
  return { largura, altura };
}

describe("proporcaoDe", () => {
  it("retrato quando altura > largura", () => {
    expect(proporcaoDe(midia(1080, 1920))).toBe("retrato");
  });

  it("paisagem quando largura > altura", () => {
    expect(proporcaoDe(midia(1920, 1080))).toBe("paisagem");
  });

  it("quadrado quando largura === altura", () => {
    expect(proporcaoDe(midia(1080, 1080))).toBe("quadrado");
  });
});

describe("slotAceita / slotCorta", () => {
  const slotRetrato: Slot = { id: "a", proporcao: "retrato", fracao: 1 };
  const slotPaisagem: Slot = { id: "a", proporcao: "paisagem", fracao: 1 };

  it("aceita mídia com proporção compatível", () => {
    expect(slotAceita(slotRetrato, midia(1080, 1920))).toBe(true);
  });

  it("rejeita mídia com proporção incompatível", () => {
    expect(slotAceita(slotPaisagem, midia(1080, 1920))).toBe(false);
  });

  it("slotCorta é o inverso de slotAceita", () => {
    expect(slotCorta(slotRetrato, midia(1080, 1920))).toBe(false);
    expect(slotCorta(slotPaisagem, midia(1080, 1920))).toBe(true);
  });
});

describe("LAYOUTS", () => {
  it("todos os layouts têm id e slots", () => {
    for (const layout of LAYOUTS) {
      expect(layout.id).toBeTruthy();
      expect(layout.slots.length).toBeGreaterThan(0);
    }
  });

  it("frações somam 1 em cada layout", () => {
    for (const layout of LAYOUTS) {
      const soma = layout.slots.reduce((s, slot) => s + slot.fracao, 0);
      expect(soma).toBeCloseTo(1, 10);
    }
  });
});

describe("LAYOUT_DE_UMA", () => {
  it("cobre as três proporções", () => {
    expect(LAYOUT_DE_UMA.retrato.slots).toHaveLength(1);
    expect(LAYOUT_DE_UMA.paisagem.slots).toHaveLength(1);
    expect(LAYOUT_DE_UMA.quadrado.slots).toHaveLength(1);
  });
});

describe("MAIOR_LAYOUT", () => {
  it("é no mínimo 1", () => {
    expect(MAIOR_LAYOUT).toBeGreaterThanOrEqual(1);
  });

  it("corresponde ao maior layout existente", () => {
    const max = LAYOUTS.reduce((n, l) => Math.max(n, l.slots.length), 1);
    expect(MAIOR_LAYOUT).toBe(max);
  });
});

describe("layoutsQueCabem", () => {
  it("retorna layouts compatíveis com prefixo de retratos", () => {
    const prefixo = [midia(1080, 1920), midia(1080, 1920), midia(1080, 1920)];
    const compativeis = layoutsQueCabem(prefixo);
    expect(compativeis.length).toBeGreaterThan(0);
    for (const l of compativeis) {
      expect(l.slots.length).toBeLessThanOrEqual(prefixo.length);
    }
  });

  it("prefixo vazio não cabe em nenhum layout", () => {
    expect(layoutsQueCabem([])).toHaveLength(0);
  });

  it("uma paisagem cabe em layout cheia-paisagem", () => {
    const compativeis = layoutsQueCabem([midia(1920, 1080)]);
    expect(compativeis.some((l) => l.id === "cheia-paisagem")).toBe(true);
  });
});

describe("escolherLayout", () => {
  it("escolhe o layout com mais slots entre os compatíveis", () => {
    const prefixo = [midia(1080, 1920), midia(1080, 1920), midia(1080, 1920)];
    const layout = escolherLayout(prefixo);
    expect(layout).not.toBeNull();
    expect(layout!.id).toBe("tira-retrato");
    expect(layout!.slots).toHaveLength(3);
  });

  it("retorna null quando nenhum layout cabe", () => {
    expect(escolherLayout([])).toBeNull();
  });

  it("retorna layout de uma para mídia isolada", () => {
    const layout = escolherLayout([midia(1080, 1080)]);
    expect(layout).not.toBeNull();
    expect(layout!.slots).toHaveLength(1);
  });
});
