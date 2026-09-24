import { describe, expect, it } from "vitest";
import { explicar, GLOSSARIO } from "./glossario";

describe("glossário do painel", () => {
  it("cobre os sete termos que o produto inventou", () => {
    expect(GLOSSARIO.map((t) => t.id)).toEqual([
      "moderacao",
      "consentimento",
      "telao",
      "missoes",
      "gate",
      "modo-endurecido",
      "retencao",
    ]);
  });

  it("explicação que não cabe num balão não explica", () => {
    for (const t of GLOSSARIO) {
      expect(t.frase.length).toBeLessThanOrEqual(160);
      expect(t.frase.length).toBeGreaterThan(20);
    }
  });

  it("nenhum termo se define usando a própria palavra", () => {
    for (const t of GLOSSARIO) {
      const primeira = t.termo.split(" ")[0]?.toLowerCase() ?? "";
      expect(t.frase.toLowerCase()).not.toContain(primeira);
    }
  });

  it("sem emoji na interface", () => {
    for (const t of GLOSSARIO) {
      expect(t.frase).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(t.termo).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it("a ajuda e o contexto leem a mesma frase", () => {
    for (const t of GLOSSARIO) {
      expect(explicar(t.id)).toBe(t.frase);
    }
  });
});
