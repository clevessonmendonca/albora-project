import { ALBORA_BRAND, MODELOS_DE_IDENTIDADE, resolveTokens, toVariables } from "@albora/tokens";
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

/**
 * O casal escolhe cor, fonte e raio, e isso é a promessa central do produto.
 * O painel resolvia só com `ALBORA_BRAND`: um evento do preset "jardim" abria
 * âmbar. O fundo continua sendo decisão de contexto (§2: admin é papel), então
 * a identidade entra sem trazer o `background` dela junto.
 */
describe("a identidade do evento propaga para o painel", () => {
  // O modelo real, não um hex inventado: se o preset mudar, o teste acompanha.
  const linho = MODELOS_DE_IDENTIDADE.find((m) => m.id === "linho")!.camada;
  const acentoDoLinho = linho.cores!.acento!;

  it("o acento do casal ganha do âmbar da marca", () => {
    const semIdentidade = adminVars("light") as Record<string, string>;
    const comIdentidade = adminVars("light", linho) as Record<string, string>;

    expect(semIdentidade["--acento"]).not.toBe(acentoDoLinho);
    expect(comIdentidade["--acento"]).toBe(acentoDoLinho);
  });

  it("o raio do casal também propaga", () => {
    const vars = adminVars("light", linho) as Record<string, string>;
    expect(vars["--raio"]).toBe(linho.escala!.raio);
  });

  it("o fundo é do contexto, não da identidade", () => {
    // O `background` da camada não decide o chão do painel. O painel é papel, então o chão claro
    // tem de ganhar — mas derivando do papel DO CASAL, não do da marca.
    const claro = adminVars("light", linho) as Record<string, string>;
    const escuro = adminVars("dark", linho) as Record<string, string>;

    const luz = (hex: string) => parseInt(hex.slice(1, 3), 16);

    expect(luz(claro["--bg"]!)).toBeGreaterThan(luz(escuro["--bg"]!));
    expect(claro["--bg"]).not.toBe(escuro["--bg"]);
  });

  it("identidade vazia deixa o painel idêntico ao de antes", () => {
    expect(adminVars("light", {})).toEqual(adminVars("light"));
  });
});
