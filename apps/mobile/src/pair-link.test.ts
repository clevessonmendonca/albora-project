import { describe, expect, it } from "vitest";
import { parsePairCodigoFromUrl, parsePairPassagemFromUrl } from "./pair-link";

describe("parsePairCodigoFromUrl", () => {
  it("lê o scheme customizado", () => {
    expect(parsePairCodigoFromUrl("albora://pair?codigo=1234")).toBe("1234");
  });

  it("lê universal link com slug", () => {
    expect(parsePairCodigoFromUrl("https://albora.app/e/festa-demo/pair?codigo=5678")).toBe("5678");
  });

  it("ignora código incompleto", () => {
    expect(parsePairCodigoFromUrl("albora://pair?codigo=12")).toBeNull();
  });

  it("ignora URL sem código", () => {
    expect(parsePairCodigoFromUrl("https://albora.app/e/festa-demo/pair")).toBeNull();
    expect(parsePairCodigoFromUrl(null)).toBeNull();
  });
});

describe("parsePairPassagemFromUrl", () => {
  it("lê passagem no scheme", () => {
    expect(parsePairPassagemFromUrl("albora://pair?passagem=abc.def")).toBe("abc.def");
  });

  it("lê passagem no universal link", () => {
    expect(parsePairPassagemFromUrl("https://albora.app/e/festa/pair?passagem=xyz.123")).toBe("xyz.123");
  });

  it("prioriza passagem quando ambos existem no parse isolado", () => {
    expect(
      parsePairPassagemFromUrl("albora://pair?codigo=1234&passagem=abc.def"),
    ).toBe("abc.def");
  });
});
