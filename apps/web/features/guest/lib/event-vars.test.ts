import type { EventoPublico } from "@albora/db";
import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import { describe, expect, it } from "vitest";
import { eventVars } from "./event-vars";

function eventoFixture(): EventoPublico {
  return {
    eventoId: "11111111-1111-1111-1111-111111111111",
    packId: "pack-inexistente",
    comecaEm: new Date("2026-08-17T20:00:00.000Z"),
    terminaEm: new Date("2026-08-18T02:00:00.000Z"),
    interacaoAbreEm: null,
    identityTokens: {},
    filtroRecomendado: null,
    fuso: "America/Sao_Paulo",
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
});
