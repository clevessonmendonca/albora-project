import { describe, expect, it } from "vitest";
import type { FaixaSugerida, LinkDeMusica } from "@albora/core";
import { filaParaTela } from "./fila-para-tela";

function link(id: string): LinkDeMusica {
  return {
    provedor: "spotify",
    tipo: "faixa",
    identificador: id,
    regiao: null,
    url: `https://open.spotify.com/track/${id}`,
  };
}

function faixa(id: string, sessoes: readonly string[]): FaixaSugerida {
  return {
    chave: `spotify:faixa:${id}`,
    link: link(id),
    sessoes,
    primeiroEm: 1,
  };
}

describe("filaParaTela", () => {
  it("expõe provedor, tipo, url e votos, nunca a sessão", () => {
    const tela = filaParaTela([faixa("4cOdK2wGLETKBW3PvgPWqT", ["ses_1", "ses_2", "ses_3"])]);

    expect(tela).toEqual([
      {
        provedor: "spotify",
        tipo: "faixa",
        url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
        votos: 3,
      },
    ]);
    expect(JSON.stringify(tela)).not.toContain("ses_");
  });

  it("preserva a ordem que o núcleo já ordenou", () => {
    const tela = filaParaTela([faixa("aaa", ["a"]), faixa("bbb", ["b", "c"])]);

    expect(tela.map((s) => s.url)).toEqual([
      "https://open.spotify.com/track/aaa",
      "https://open.spotify.com/track/bbb",
    ]);
  });
});
