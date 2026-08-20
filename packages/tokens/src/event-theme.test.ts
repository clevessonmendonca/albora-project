import { ALBORA_BRAND, resolveGuestThemeVariables, toVariables } from "@albora/tokens";
import { describe, expect, it } from "vitest";

describe("resolveGuestThemeVariables", () => {
  const ACENTO_VENDOR = ALBORA_BRAND.cores.critico;
  const ACENTO_EVENTO = ALBORA_BRAND.cores.papel;

  it("sem camadas extras espelha a marca", () => {
    const vars = resolveGuestThemeVariables({ identityTokens: {} });
    const marca = toVariables(ALBORA_BRAND);
    expect(vars["--bg"]).toBe(marca["--bg"]);
    expect(vars["--acento"]).toBe(marca["--acento"]);
  });

  it("vendor altera o acento", () => {
    const vars = resolveGuestThemeVariables({
      identityTokens: {},
      vendorBrandTokens: { cores: { acento: ACENTO_VENDOR } },
    });
    expect(vars["--acento"]).toBe(ACENTO_VENDOR);
  });

  it("evento vence vendor", () => {
    const vars = resolveGuestThemeVariables({
      identityTokens: { cores: { acento: ACENTO_EVENTO } },
      vendorBrandTokens: { cores: { acento: ACENTO_VENDOR } },
    });
    expect(vars["--acento"]).toBe(ACENTO_EVENTO);
  });

  it("background explícito re-deriva a escala", () => {
    const claro = resolveGuestThemeVariables({ identityTokens: {}, background: "light" });
    const escuro = resolveGuestThemeVariables({ identityTokens: {} });
    expect(claro["--bg"]).not.toBe(escuro["--bg"]);
  });
});
