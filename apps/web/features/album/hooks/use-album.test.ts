import { afterEach, describe, expect, it, vi } from "vitest";
import type { ServedAlbum } from "@/lib/album";
import { buscarAlbum, comAlbum, comFalha, estadoInicial } from "./use-album";

const album = (parcial: Partial<ServedAlbum> = {}): ServedAlbum => ({
  capitulos: [],
  totalDePaginas: 0,
  contadores: { fotos: 0, convidados: 0, missoes: 0 },
  interacao: "espelho",
  expiraEm: Date.now() + 60_000,
  ...parcial,
});

describe("o álbum nasce carregando", () => {
  it("a primeira tela desenha a moldura, não um vazio", () => {
    const e = estadoInicial();
    expect(e.carregando).toBe(true);
    expect(e.jaCarregou).toBe(false);
    expect(e.album).toBeNull();
  });
});

describe("buscar GET /api/album", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devolve o álbum montado", async () => {
    const corpo = album({
      contadores: { fotos: 3, convidados: 2, missoes: 1 },
      capitulos: [
        {
          id: "cerimonia",
          titulo: "A cerimônia",
          comecaEm: "2026-08-08T23:00:00.000Z",
          paginas: [],
        },
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ album: corpo }), { status: 200 })),
    );

    const r = await buscarAlbum();

    expect(r).toEqual({ ok: true, album: corpo });
    expect(r.ok && r.album.capitulos[0]?.titulo).toBe("A cerimônia");
    expect(fetch).toHaveBeenCalledWith("/api/album", { credentials: "same-origin" });
  });

  it("401 é sessão, o resto é rede", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    expect(await buscarAlbum()).toEqual({ ok: false, falha: "sessao" });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })));
    expect(await buscarAlbum()).toEqual({ ok: false, falha: "rede" });
  });
});

describe("transições", () => {
  it("sucesso troca a moldura pelo álbum", () => {
    const e = comAlbum(estadoInicial(), album({ totalDePaginas: 2 }));
    expect(e.carregando).toBe(false);
    expect(e.jaCarregou).toBe(true);
    expect(e.album?.totalDePaginas).toBe(2);
  });

  it("falha não apaga o álbum que já estava na tela", () => {
    const cheio = comAlbum(estadoInicial(), album());
    const falhou = comFalha(cheio, "rede");
    expect(falhou.album).toBe(cheio.album);
    expect(falhou.falha).toBe("rede");
  });
});
