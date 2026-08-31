import { describe, expect, it } from "vitest";
import { appPairSchemeLink, appPairUniversalLink, appPairUniversalPath } from "./app-pair-link";

describe("links de pareamento web → app", () => {
  it("monta o scheme nativo com quatro dígitos", () => {
    expect(appPairSchemeLink("1234")).toBe("albora://pair?codigo=1234");
  });

  it("ignora lixo não numérico no código", () => {
    expect(appPairSchemeLink("12-34")).toBe("albora://pair?codigo=1234");
  });

  it("monta o caminho universal com slug escapado", () => {
    expect(appPairUniversalPath("ana-e-joao", "5678")).toBe("/e/ana-e-joao/pair?codigo=5678");
  });

  it("monta URL absoluta a partir da origem da web", () => {
    expect(appPairUniversalLink("https://albora.app/", "festa-demo", "9012")).toBe(
      "https://albora.app/e/festa-demo/pair?codigo=9012",
    );
  });

  it("recusa código curto", () => {
    expect(() => appPairSchemeLink("123")).toThrow(/4 dígitos/);
  });
});
