import { PACKS } from "@albora/packs";
import { ALBORA_BRAND, resolveGuestThemeVariables, toVariables } from "@albora/tokens";
import { describe, expect, it } from "vitest";
import {
  brandFallbackVariables,
  parseGuestEventTheme,
  themeVariablesFromEvent,
  type GuestEventTheme,
} from "./event-theme";

function themeFixture(overrides?: Partial<GuestEventTheme>): GuestEventTheme {
  return {
    packId: "pack-inexistente",
    identityTokens: {},
    vendorBrandTokens: null,
    filtroRecomendado: null,
    fuso: "America/Sao_Paulo",
    ...overrides,
  };
}

describe("parseGuestEventTheme", () => {
  it("aceita o payload mínimo da API", () => {
    expect(
      parseGuestEventTheme({
        packId: "casamento",
        identityTokens: {},
        vendorBrandTokens: null,
        filtroRecomendado: null,
        fuso: "America/Sao_Paulo",
      }),
    ).toEqual({
      packId: "casamento",
      identityTokens: {},
      vendorBrandTokens: null,
      filtroRecomendado: null,
      fuso: "America/Sao_Paulo",
    });
  });

  it("recusa body sem packId", () => {
    expect(
      parseGuestEventTheme({
        identityTokens: {},
        vendorBrandTokens: null,
        filtroRecomendado: null,
        fuso: "America/Sao_Paulo",
      }),
    ).toBeNull();
  });
});

describe("themeVariablesFromEvent — camada vendor", () => {
  const ACENTO_VENDOR = ALBORA_BRAND.cores.critico;
  const ACENTO_EVENTO = ALBORA_BRAND.cores.papel;

  it("com vendorBrandTokens, o acento difere do padrão Albora", () => {
    const vars = themeVariablesFromEvent(
      themeFixture({ vendorBrandTokens: { cores: { acento: ACENTO_VENDOR } } }),
    );
    const padrao = brandFallbackVariables();

    expect(vars["--acento"]).toBe(ACENTO_VENDOR);
    expect(vars["--acento"]).not.toBe(padrao["--acento"]);
  });

  it("identityTokens do evento vence vendor", () => {
    const vars = themeVariablesFromEvent(
      themeFixture({
        vendorBrandTokens: { cores: { acento: ACENTO_VENDOR } },
        identityTokens: { cores: { acento: ACENTO_EVENTO } },
      }),
    );

    expect(vars["--acento"]).toBe(ACENTO_EVENTO);
  });

  it("pack real entra na cadeia quando o id existe", () => {
    const packId = Object.keys(PACKS)[0];
    if (!packId) return;
    const pack = PACKS[packId]!;
    const vars = themeVariablesFromEvent(themeFixture({ packId }));
    const esperado = resolveGuestThemeVariables({
      identityTokens: {},
      vendorBrandTokens: null,
      packTokens: pack.tokens,
    });
    expect(vars["--acento"]).toBe(esperado["--acento"]);
  });

  it("fallback de marca é estável", () => {
    expect(brandFallbackVariables()["--bg"]).toBe(toVariables(ALBORA_BRAND)["--bg"]);
  });
});
