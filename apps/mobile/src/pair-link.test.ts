import { describe, expect, it } from "vitest";
import {
  pairPayloadFromParams,
  pairPayloadKey,
  parsePairCodigoFromUrl,
  parsePairPassagemFromUrl,
} from "./pair-link";

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
    expect(parsePairPassagemFromUrl("albora://pair?codigo=1234&passagem=abc.def")).toBe("abc.def");
  });
});

describe("pairPayloadFromParams", () => {
  it("preferência passagem sobre codigo", () => {
    expect(pairPayloadFromParams({ codigo: "1234", passagem: "tok.en" })).toEqual({
      passagem: "tok.en",
    });
  });

  it("aceita arrays do Expo Router", () => {
    expect(pairPayloadFromParams({ codigo: ["9012"] })).toEqual({ codigo: "9012" });
  });

  it("chave estável para anti-duplicata", () => {
    expect(pairPayloadKey({ passagem: "a.b" })).toBe("p:a.b");
    expect(pairPayloadKey({ codigo: "1234" })).toBe("c:1234");
  });

  it("null sem params", () => {
    expect(pairPayloadFromParams({})).toBeNull();
  });
});
