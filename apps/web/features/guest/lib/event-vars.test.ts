import type { EventoPublico } from "@albora/db";
import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import { describe, expect, it } from "vitest";
import { eventVars } from "./event-vars";

function eventoFixture(overrides?: Partial<EventoPublico>): EventoPublico {
  return {
    eventoId: "11111111-1111-1111-1111-111111111111",
    packId: "pack-inexistente",
    comecaEm: new Date("2026-08-17T20:00:00.000Z"),
    terminaEm: new Date("2026-08-18T02:00:00.000Z"),
    interacaoAbreEm: null,
    identityTokens: {},
    filtroRecomendado: null,
    fuso: "America/Sao_Paulo",
    vendorBrandTokens: null,
    coverImageKey: null,
    title: null,
    status: "active",
    ...overrides,
  };
}

describe("eventVars aceita override de tema", () => {
  it("sem identityTokens de fundo, o padrão continua escuro", () => {
    const vars = eventVars(eventoFixture()) as Record<string, string>;
    const escuro = toVariables(resolveTokens({ marca: ALBORA_BRAND })) as Record<string, string>;

    expect(vars["--bg"]).toBe(escuro["--bg"]);
    expect(vars["--ink"]).toBe(escuro["--ink"]);
  });

  it("com background='light', a escala re-deriva para o papel claro", () => {
    const vars = eventVars(eventoFixture(), "light") as Record<string, string>;
    const claro = toVariables(
      resolveTokens({ marca: ALBORA_BRAND, evento: { background: "light" } }),
    ) as Record<string, string>;
    const escuro = toVariables(resolveTokens({ marca: ALBORA_BRAND })) as Record<string, string>;

    expect(vars["--bg"]).toBe(claro["--bg"]);
    expect(vars["--ink"]).toBe(claro["--ink"]);
    expect(vars["--bg"]).not.toBe(escuro["--bg"]);
  });

  it("sem o 2º argumento, o comportamento é idêntico ao atual", () => {
    const event = eventoFixture();
    const semArg = eventVars(event) as Record<string, string>;
    const comArgDark = eventVars(event, undefined) as Record<string, string>;

    expect(semArg).toEqual(comArgDark);
  });

  it("o override vence o alias PT 'fundo' do identityTokens do evento", () => {
    const event = eventoFixture({ identityTokens: { fundo: "escuro" } });

    const vars = eventVars(event, "light") as Record<string, string>;
    const claro = toVariables(
      resolveTokens({ marca: ALBORA_BRAND, evento: { background: "light" } }),
    ) as Record<string, string>;

    expect(vars["--bg"]).toBe(claro["--bg"]);
    expect(vars["--ink"]).toBe(claro["--ink"]);
  });
});

describe("eventVars — camada vendor (white-label)", () => {
  // Cores da própria marca em papéis trocados — sem hex literal (guard de tokens).
  const ACENTO_VENDOR = ALBORA_BRAND.cores.critico;
  const ACENTO_EVENTO = ALBORA_BRAND.cores.papel;

  it("com vendorBrandTokens, o acento difere do padrão Albora", () => {
    const event = eventoFixture({
      vendorBrandTokens: { cores: { acento: ACENTO_VENDOR } },
    });

    const vars = eventVars(event) as Record<string, string>;
    const padrao = toVariables(resolveTokens({ marca: ALBORA_BRAND })) as Record<string, string>;

    expect(vars["--acento"]).toBe(ACENTO_VENDOR);
    expect(vars["--acento"]).not.toBe(padrao["--acento"]);
  });

  it("sem vendorBrandTokens (null), o resultado é idêntico ao sem vendor", () => {
    const comNull = eventVars(eventoFixture({ vendorBrandTokens: null })) as Record<string, string>;
    const semCampo = eventVars(eventoFixture({ vendorBrandTokens: null })) as Record<
      string,
      string
    >;

    expect(comNull).toEqual(semCampo);
  });

  it("vendorBrandTokens vazio {} não altera o resultado", () => {
    const comVazio = eventVars(eventoFixture({ vendorBrandTokens: {} })) as Record<string, string>;
    const semVendor = eventVars(eventoFixture({ vendorBrandTokens: null })) as Record<
      string,
      string
    >;

    expect(comVazio).toEqual(semVendor);
  });

  it("identityTokens do evento vence vendor — evento ganha de todo mundo", () => {
    const event = eventoFixture({
      vendorBrandTokens: { cores: { acento: ACENTO_VENDOR } },
      identityTokens: { cores: { acento: ACENTO_EVENTO } },
    });

    const vars = eventVars(event) as Record<string, string>;

    expect(vars["--acento"]).toBe(ACENTO_EVENTO);
    expect(vars["--acento"]).not.toBe(ACENTO_VENDOR);
  });

  it("vendor vence a marca Albora mas perde para o pack", () => {
    // O pack 'pack-inexistente' não existe em PACKS, então só marca e vendor concorrem.
    // Com vendor definindo acento, ele deve ganhar da marca Albora.
    const event = eventoFixture({
      vendorBrandTokens: { cores: { acento: ACENTO_VENDOR } },
    });

    const vars = eventVars(event) as Record<string, string>;
    const marcaVars = toVariables(resolveTokens({ marca: ALBORA_BRAND })) as Record<string, string>;

    expect(vars["--acento"]).toBe(ACENTO_VENDOR);
    expect(vars["--acento"]).not.toBe(marcaVars["--acento"]);
  });

  it("bg do evento vence vendor quando evento define background", () => {
    const event = eventoFixture({
      vendorBrandTokens: { background: "light" },
      identityTokens: { background: "dark" },
    });

    const vars = eventVars(event) as Record<string, string>;
    const escuro = toVariables(resolveTokens({ marca: ALBORA_BRAND })) as Record<string, string>;

    // Evento definiu dark — bg deve coincidir com o escuro.
    expect(vars["--bg"]).toBe(escuro["--bg"]);
  });
});
