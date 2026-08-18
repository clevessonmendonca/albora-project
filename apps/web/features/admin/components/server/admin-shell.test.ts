import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import { describe, expect, it } from "vitest";
import { adminVars } from "./admin-shell";

describe("adminVars resolve o admin no chão claro por padrão", () => {
  it("sem argumento, --bg é igual ao claro (não herda o escuro da marca)", () => {
    const vars = adminVars() as Record<string, string>;
    const claro = toVariables(
      resolveTokens({ marca: ALBORA_BRAND, pack: { background: "light" } }),
    ) as Record<string, string>;
    const escuro = toVariables(resolveTokens({ marca: ALBORA_BRAND })) as Record<string, string>;

    expect(vars["--bg"]).toBe(claro["--bg"]);
    expect(vars["--ink"]).toBe(claro["--ink"]);
    expect(vars["--bg"]).not.toBe(escuro["--bg"]);
  });

  it("com 'dark', o override ainda funciona", () => {
    const vars = adminVars("dark") as Record<string, string>;
    const escuro = toVariables(resolveTokens({ marca: ALBORA_BRAND })) as Record<string, string>;

    expect(vars["--bg"]).toBe(escuro["--bg"]);
    expect(vars["--ink"]).toBe(escuro["--ink"]);
  });
});
