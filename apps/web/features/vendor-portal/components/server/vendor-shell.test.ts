import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import { describe, expect, it } from "vitest";
import { vendorVars } from "./vendor-shell";

describe("vendorVars insere a camada do fornecedor entre a marca e o piso claro", () => {
  it("sem marca do fornecedor, cai no mesmo claro do admin", () => {
    const vars = vendorVars({}) as Record<string, string>;
    const claro = toVariables(
      resolveTokens({ marca: ALBORA_BRAND, pack: { background: "light" } }),
    ) as Record<string, string>;

    expect(vars["--bg"]).toBe(claro["--bg"]);
    expect(vars["--ink"]).toBe(claro["--ink"]);
  });

  it("com brand_tokens do fornecedor, a camada dele ganha do piso Albora", () => {
    const marcaDoFornecedor = { fontes: { titulo: "Fornecedor Display, serif" } };
    const vars = vendorVars(marcaDoFornecedor) as Record<string, string>;
    const semFornecedor = toVariables(
      resolveTokens({ marca: ALBORA_BRAND, pack: { background: "light" } }),
    ) as Record<string, string>;

    expect(vars["--fonte-titulo"]).toBe("Fornecedor Display, serif");
    expect(vars["--fonte-titulo"]).not.toBe(semFornecedor["--fonte-titulo"]);
  });
});
