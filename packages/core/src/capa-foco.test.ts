import { describe, expect, it } from "vitest";
import { capaFocoDoEvento, capaFocoValido, capaObjectPosition } from "./capa-foco";

describe("enquadramento da capa", () => {
  it("só aceita os três focos fechados", () => {
    expect([25, 50, 75].every(capaFocoValido)).toBe(true);
    expect([0, 30, 100, "50", null, undefined].some(capaFocoValido)).toBe(false);
  });

  it("sem escolha (ou escolha inválida) cai no centro", () => {
    expect(capaFocoDoEvento({})).toBe(50);
    expect(capaFocoDoEvento(null)).toBe(50);
    expect(capaFocoDoEvento({ capaFoco: 33 })).toBe(50);
    expect(capaFocoDoEvento({ capaFoco: 75 })).toBe(75);
  });

  it("vira object-position vertical", () => {
    expect(capaObjectPosition(25)).toBe("50% 25%");
  });
});
