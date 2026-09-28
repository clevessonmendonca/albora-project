import { describe, expect, it } from "vitest";
import { monograma } from "./monograma";

describe("monograma", () => {
  it("dois nomes ligados viram as duas iniciais", () => {
    expect(monograma("Clevesson & Miriã")).toBe("C&M");
    expect(monograma("Ana e João")).toBe("A&J");
  });

  it("nome único vira a primeira letra", () => {
    expect(monograma("Aniversário")).toBe("A");
  });

  it("usa a primeira e a última palavra, não as duas primeiras", () => {
    expect(monograma("Festa de 15 anos da Beatriz")).toBe("F&B");
  });

  it("ignora pontuação e acento não quebra", () => {
    expect(monograma("Évora — Ópera")).toBe("É&Ó");
  });

  it("nome vazio não estoura", () => {
    expect(monograma("   ")).toBe("•");
  });
});
