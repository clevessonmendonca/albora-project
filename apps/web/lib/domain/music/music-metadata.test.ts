import { lerLinkDeMusica, type LinkDeMusica } from "@albora/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buscarMetadadoDaMusica,
  destinoDoRedirect,
  hostPermitido,
  lerOEmbed,
  lerOpenGraph,
  pedidoDeMetadado,
} from "./music-metadata";

function faixa(url: string): LinkDeMusica {
  const r = lerLinkDeMusica(url);
  if (!r.ok) throw new Error(`fixture inválida: ${url}`);
  return r.link;
}

const SPOTIFY = faixa("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT");
const YOUTUBE = faixa("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
const YOUTUBE_MUSIC = faixa("https://music.youtube.com/watch?v=dQw4w9WgXcQ");
const APPLE = faixa("https://music.apple.com/br/song/1440857785");
const DEEZER = faixa("https://www.deezer.com/track/3135556");

describe("pedidoDeMetadado só aponta hosts da lista fechada", () => {
  it("Spotify e YouTube usam oEmbed no próprio catálogo", () => {
    const spotify = pedidoDeMetadado(SPOTIFY);
    const youtube = pedidoDeMetadado(YOUTUBE);
    const music = pedidoDeMetadado(YOUTUBE_MUSIC);

    expect(spotify).toEqual({
      formato: "oembed",
      url: `https://open.spotify.com/oembed?url=${encodeURIComponent(SPOTIFY.url)}`,
    });
    expect(youtube?.formato).toBe("oembed");
    expect(youtube?.url.startsWith("https://www.youtube.com/oembed?")).toBe(true);
    expect(music?.url.startsWith("https://www.youtube.com/oembed?")).toBe(true);
    expect(hostPermitido(new URL(spotify!.url))).toBe(true);
    expect(hostPermitido(new URL(youtube!.url))).toBe(true);
  });

  it("Apple Music e Deezer leem Open Graph da URL canônica", () => {
    expect(pedidoDeMetadado(APPLE)).toEqual({ formato: "og", url: APPLE.url });
    expect(pedidoDeMetadado(DEEZER)).toEqual({ formato: "og", url: DEEZER.url });
  });

  it("link montado à mão com host fora da lista não vira fetch", () => {
    expect(
      pedidoDeMetadado({
        ...SPOTIFY,
        url: "https://evil.example/track/x",
      }),
    ).toBeNull();
  });
});

describe("destinoDoRedirect não segue para fora da lista", () => {
  it("aceita salto no mesmo catálogo e recusa o resto", () => {
    expect(
      destinoDoRedirect(
        "https://www.youtube.com/oembed?url=x",
        "https://www.youtube.com/oembed?url=y",
      ),
    ).toBe("https://www.youtube.com/oembed?url=y");
    expect(
      destinoDoRedirect("https://open.spotify.com/oembed?url=x", "https://evil.example/x"),
    ).toBeNull();
    expect(
      destinoDoRedirect("https://open.spotify.com/oembed?url=x", "http://open.spotify.com/x"),
    ).toBeNull();
    expect(
      destinoDoRedirect("https://open.spotify.com/oembed?url=x", "https://127.0.0.1/x"),
    ).toBeNull();
    expect(
      destinoDoRedirect(
        "https://open.spotify.com/oembed?url=x",
        "https://user:pass@open.spotify.com/x",
      ),
    ).toBeNull();
  });
});

describe("lerOEmbed e lerOpenGraph", () => {
  it("lê title e author_name do oEmbed", () => {
    expect(lerOEmbed({ title: "Perfect", author_name: "Ed Sheeran" })).toEqual({
      titulo: "Perfect",
      artista: "Ed Sheeran",
      capaUrl: null,
    });
    expect(lerOEmbed({ title: "  " })).toBeNull();
    expect(lerOEmbed({ author_name: "X" })).toBeNull();
  });

  it("lê og:title nas duas ordens de atributo, sem capa", () => {
    expect(
      lerOpenGraph(
        `<meta property="og:title" content="Anti-Hero"><meta property="og:audio:artist" content="Taylor Swift">`,
      ),
    ).toEqual({ titulo: "Anti-Hero", artista: "Taylor Swift", capaUrl: null });

    expect(
      lerOpenGraph(`<meta content="Blinding Lights" property="og:title">`),
    ).toEqual({ titulo: "Blinding Lights", artista: null, capaUrl: null });

    expect(lerOpenGraph(`<meta property="og:image" content="https://cdn.example/a.jpg">`)).toBeNull();
  });
});

describe("buscarMetadadoDaMusica degrada", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("grava o oEmbed do Spotify e não segue redirect fora da lista", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
      const href = String(_url);
      if (href.startsWith("https://open.spotify.com/oembed")) {
        return new Response(JSON.stringify({ title: "Perfect", author_name: "Ed Sheeran" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("no", { status: 500 });
    });

    expect(await buscarMetadadoDaMusica(SPOTIFY, { fetch: fetchMock })).toEqual({
      titulo: "Perfect",
      artista: "Ed Sheeran",
      capaUrl: null,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      redirect: "manual",
      credentials: "omit",
    });
  });

  it("redirect para host fora da lista devolve null e não busca o destino", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(null, {
        status: 302,
        headers: { location: "https://169.254.169.254/latest" },
      });
    });

    expect(await buscarMetadadoDaMusica(YOUTUBE, { fetch: fetchMock })).toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/^https:\/\/www\.youtube\.com\/oembed/);
  });

  it("provedor mudo ou JSON inválido não estoura", async () => {
    const fetchMock = vi.fn(async () => new Response("não é json", { status: 200 }));
    expect(await buscarMetadadoDaMusica(SPOTIFY, { fetch: fetchMock })).toBeNull();

    const boom = vi.fn(async () => {
      throw new Error("rede");
    });
    expect(await buscarMetadadoDaMusica(DEEZER, { fetch: boom })).toBeNull();
  });

  it("timeout curto aborta e devolve null", async () => {
    const fetchMock = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        });
      });
    });

    expect(await buscarMetadadoDaMusica(APPLE, { fetch: fetchMock, tetoMs: 20 })).toBeNull();
  });
});
