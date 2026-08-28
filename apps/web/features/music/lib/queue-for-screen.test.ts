import { describe, expect, it } from "vitest";
import type { FaixaSugerida, LinkDeMusica } from "@albora/core";
import { queueForScreen } from "./queue-for-screen";

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
    id: `id-${id}`,
  };
}

describe("queueForScreen", () => {
  it("expõe id, provedor, tipo, url e votos, nunca a sessão", () => {
    const tela = queueForScreen([faixa("4cOdK2wGLETKBW3PvgPWqT", ["ses_1", "ses_2", "ses_3"])]);

    expect(tela).toEqual([
      {
        id: "id-4cOdK2wGLETKBW3PvgPWqT",
        provedor: "spotify",
        tipo: "faixa",
        url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
        votos: 3,
        titulo: null,
        artista: null,
      },
    ]);
    expect(JSON.stringify(tela)).not.toContain("ses_");
  });

  it("sem id (fila reconstruída em memória), cai no fallback da chave", () => {
    const semId: FaixaSugerida = {
      chave: "spotify:faixa:xyz",
      link: link("xyz"),
      sessoes: ["ses_1"],
      primeiroEm: 1,
    };

    expect(queueForScreen([semId])[0]?.id).toBe("spotify:faixa:xyz");
  });

  it("preserva a ordem que o núcleo já ordenou", () => {
    const tela = queueForScreen([faixa("aaa", ["a"]), faixa("bbb", ["b", "c"])]);

    expect(tela.map((s) => s.url)).toEqual([
      "https://open.spotify.com/track/aaa",
      "https://open.spotify.com/track/bbb",
    ]);
  });

  it("expõe título e artista quando a faixa já tem metadado", () => {
    const comTitulo: FaixaSugerida = {
      ...faixa("4cOdK2wGLETKBW3PvgPWqT", ["ses_1"]),
      metadado: { titulo: "Perfect", artista: "Ed Sheeran", capaUrl: null },
    };

    expect(queueForScreen([comTitulo])[0]).toMatchObject({
      titulo: "Perfect",
      artista: "Ed Sheeran",
      url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    });
  });
});
