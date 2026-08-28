import { describe, expect, it } from "vitest";
import { appPairSchemeLinkPassagem, appPairUniversalLinkPassagem } from "./app-pair-link";

describe("links de passagem web → app", () => {
  const passagem = "abc.def";

  it("monta o scheme com passagem escapada", () => {
    expect(appPairSchemeLinkPassagem(passagem)).toBe("albora://pair?passagem=abc.def");
  });

  it("monta universal link com passagem", () => {
    expect(appPairUniversalLinkPassagem("https://albora.app", "festa-demo", passagem)).toBe(
      "https://albora.app/e/festa-demo/pair?passagem=abc.def",
    );
  });

  it("recusa passagem vazia", () => {
    expect(() => appPairSchemeLinkPassagem("  ")).toThrow(/passagem/i);
  });
});
