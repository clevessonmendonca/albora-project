import { lerLinkDeMusica, type LinkDeMusica, type MetadadoDaMusica } from "@albora/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { metadadoParaFaixaDoCasal, serializarMusicaDoCasal } from "./music-track";

function faixa(url: string): LinkDeMusica {
  const r = lerLinkDeMusica(url);
  if (!r.ok) throw new Error(`fixture inválida: ${url}`);
  return r.link;
}

const LINK = faixa("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT");

describe("serializarMusicaDoCasal mostra título — artista", () => {
  it("junta título e artista no rótulo da tela", () => {
    expect(
      serializarMusicaDoCasal({
        link: LINK,
        metadado: { titulo: "Perfect", artista: "Ed Sheeran", capaUrl: null },
      }),
    ).toEqual({
      provedor: "spotify",
      rotulo: "Perfect — Ed Sheeran",
      url: LINK.url,
      capaUrl: null,
    });
  });

  it("sem metadado cai para o link cru, e não some", () => {
    expect(serializarMusicaDoCasal({ link: LINK, metadado: null })).toEqual({
      provedor: "spotify",
      rotulo: LINK.url,
      url: LINK.url,
      capaUrl: null,
    });
  });

  it("não serializa campo de áudio", () => {
    const corpo = serializarMusicaDoCasal({
      link: LINK,
      metadado: { titulo: "Perfect", artista: "Ed Sheeran", capaUrl: null },
    });
    expect(Object.keys(corpo ?? {}).sort()).toEqual(["capaUrl", "provedor", "rotulo", "url"]);
  });
});

describe("metadadoParaFaixaDoCasal reusa o resolvedor e falha aberto", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("grava título e artista do oEmbed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ title: "Perfect", author_name: "Ed Sheeran" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(metadadoParaFaixaDoCasal(LINK)).resolves.toEqual({
      titulo: "Perfect",
      artista: "Ed Sheeran",
      capaUrl: null,
    } satisfies MetadadoDaMusica);
  });

  it("provedor mudo não estoura — devolve null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("rede");
      }),
    );

    await expect(metadadoParaFaixaDoCasal(LINK)).resolves.toBeNull();
  });
});
