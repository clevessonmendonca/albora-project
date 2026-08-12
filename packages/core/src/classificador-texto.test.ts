import { describe, expect, it } from "vitest";
import { classificarTexto } from "./classificador-texto";

describe("classificarTexto", () => {
  it("texto neutro de festa fica limpo", () => {
    expect(classificarTexto("a tia Cida rindo antes de derrubar o copo")).toBe("limpo");
  });

  it("insulto óbvio fica suspeito", () => {
    expect(classificarTexto("que merda de festa")).toBe("suspeito");
  });

  it("script injection continua limpo na classificação — escapar é na saída", () => {
    expect(classificarTexto("<script>alert(1)</script>")).toBe("limpo");
  });
});
