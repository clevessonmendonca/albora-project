import { describe, expect, it } from "vitest";
import { truncateLabel, formatDate } from "./cover-utils";

describe("truncateLabel", () => {
  it("retorna intacto quando dentro do limite", () => {
    expect(truncateLabel("Curto")).toBe("Curto");
    expect(truncateLabel("Exatos dezesseis")).toBe("Exatos dezesseis");
  });

  it("trunca com reticências quando excede o limite", () => {
    const longo = "Este é um rótulo muito longo demais";
    const resultado = truncateLabel(longo);
    expect(resultado.length).toBeLessThanOrEqual(16);
    expect(resultado).toMatch(/…$/);
  });

  it("aceita limite customizado", () => {
    expect(truncateLabel("ABCDE", 3)).toBe("AB…");
    expect(truncateLabel("AB", 3)).toBe("AB");
    expect(truncateLabel("ABC", 3)).toBe("ABC");
  });

  it("string vazia permanece vazia", () => {
    expect(truncateLabel("")).toBe("");
  });
});

describe("formatDate", () => {
  it("formata data em pt-BR (dia + mês por extenso)", () => {
    const resultado = formatDate("2026-09-01T18:00:00Z");
    expect(resultado).toContain("1");
    expect(resultado).toMatch(/setembro/i);
  });

  it("formata data de dezembro", () => {
    const resultado = formatDate("2026-12-25T00:00:00Z");
    expect(resultado).toMatch(/dezembro/i);
  });
});
