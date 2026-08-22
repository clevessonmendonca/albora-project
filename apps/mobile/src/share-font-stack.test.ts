import { describe, expect, it } from "vitest";
import { ALBORA_BRAND } from "@albora/tokens";
import { familiaEmbutidaDaStack, primeiraFamiliaFonte } from "./share-font-stack";

describe("primeiraFamiliaFonte", () => {
  it("pega Fraunces da stack da marca", () => {
    expect(primeiraFamiliaFonte("Fraunces, Georgia, serif")).toBe("Fraunces");
  });

  it("remove aspas", () => {
    expect(primeiraFamiliaFonte('"Instrument Sans", sans-serif')).toBe("Instrument Sans");
  });

  it("var() cai no System", () => {
    expect(primeiraFamiliaFonte("var(--fonte-corpo)")).toBe("System");
  });
});

describe("familiaEmbutidaDaStack", () => {
  it("marca Albora → Fraunces / Instrument Sans", () => {
    expect(familiaEmbutidaDaStack(ALBORA_BRAND.fontes.titulo)).toBe("Fraunces");
    expect(familiaEmbutidaDaStack(ALBORA_BRAND.fontes.corpo)).toBe("Instrument Sans");
  });

  it("stack só com Georgia mapeia para Fraunces", () => {
    expect(familiaEmbutidaDaStack("Georgia, Times, serif")).toBe("Fraunces");
  });

  it("stack sans genérica mapeia para Instrument Sans", () => {
    expect(familiaEmbutidaDaStack("Helvetica Neue, Helvetica, Arial, sans-serif")).toBe(
      "Instrument Sans",
    );
  });

  it("Instrument Sans explícito", () => {
    expect(familiaEmbutidaDaStack('"Instrument Sans", ui-sans-serif, sans-serif')).toBe(
      "Instrument Sans",
    );
  });

  it("var() não resolvido → null", () => {
    expect(familiaEmbutidaDaStack("var(--fonte-corpo)")).toBeNull();
  });

  it("família desconhecida sem categoria → null", () => {
    expect(familiaEmbutidaDaStack("Comic Neue")).toBeNull();
  });
});
