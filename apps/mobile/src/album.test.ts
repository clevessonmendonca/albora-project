import { describe, expect, it, vi } from "vitest";
import {
  buscarAlbum,
  thumbDoCaptitulo,
  totalFotosCapitulo,
  type AlbumResposta,
  type CapituloAlbum,
} from "./album";
import type { GuestSession } from "./session";

const sessao: GuestSession = {
  token: "tok.x",
  slug: "festa-demo",
  sessaoId: "sess-1",
  eventoId: "ev-1",
};

function albumVazio(parcial: Partial<AlbumResposta> = {}): AlbumResposta {
  return {
    capitulos: [],
    totalDePaginas: 0,
    contadores: { fotos: 0, convidados: 0, missoes: 0 },
    interacao: "espelho",
    expiraEm: Date.now() + 60_000,
    ...parcial,
  };
}

function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockImplementation((url: string | URL | Request) => {
    const urlStr =
      typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    if (urlStr.includes("/api/media/urls")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ urls: [] }),
      });
    }
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });
  }) as unknown as typeof fetch;
}

function capituloComFotos(overrides: Partial<CapituloAlbum> = {}): CapituloAlbum {
  return {
    id: "cerimonia",
    titulo: "Cerimônia",
    comecaEm: "2026-08-08T23:00:00.000Z",
    paginas: [
      {
        layoutId: "l-1",
        amanhecer: false,
        hora: 23,
        inicioDaHora: "2026-08-08T23:00:00.000Z",
        lugarId: null,
        fotos: [
          {
            id: "f-1",
            url: "https://cdn.example/full.jpg",
            urlThumb: "https://cdn.example/thumb.jpg",
            missaoId: null,
            slot: { id: "s-1", proporcao: "4/5", fracao: 1 },
          },
          {
            id: "f-2",
            url: "https://cdn.example/full2.jpg",
            urlThumb: "https://cdn.example/thumb2.jpg",
            missaoId: "miss-1",
            slot: { id: "s-2", proporcao: "1/1", fracao: 0.5 },
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("buscarAlbum", () => {
  it("devolve o álbum quando o servidor responde OK", async () => {
    const album = albumVazio({
      contadores: { fotos: 3, convidados: 2, missoes: 1 },
      capitulos: [capituloComFotos()],
    });
    const fetchFn = mockFetch({ album });

    const resultado = await buscarAlbum(sessao, fetchFn);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.album.capitulos).toHaveLength(1);
      expect(resultado.album.contadores.fotos).toBe(3);
    }
  });

  it("inclui eventoId como query param", async () => {
    const album = albumVazio();
    const fetchFn = mockFetch({ album });

    await buscarAlbum(sessao, fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining("eventoId=ev-1"),
      expect.objectContaining({ headers: expect.objectContaining({ cookie: expect.any(String) }) }),
    );
  });

  it("401 retorna falha: sessao", async () => {
    const fetchFn = mockFetch({}, 401);
    const resultado = await buscarAlbum(sessao, fetchFn);
    expect(resultado).toEqual({ ok: false, falha: "sessao" });
  });

  it("403 retorna falha: sessao", async () => {
    const fetchFn = mockFetch({}, 403);
    const resultado = await buscarAlbum(sessao, fetchFn);
    expect(resultado).toEqual({ ok: false, falha: "sessao" });
  });

  it("500 retorna falha: rede", async () => {
    const fetchFn = mockFetch({}, 500);
    const resultado = await buscarAlbum(sessao, fetchFn);
    expect(resultado).toEqual({ ok: false, falha: "rede" });
  });

  it("erro de rede (throw) retorna falha: rede", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    const resultado = await buscarAlbum(sessao, fetchFn);
    expect(resultado).toEqual({ ok: false, falha: "rede" });
  });

  it("corpo sem campo album retorna falha: rede", async () => {
    const fetchFn = mockFetch({ outro: "campo" });
    const resultado = await buscarAlbum(sessao, fetchFn);
    expect(resultado).toEqual({ ok: false, falha: "rede" });
  });

  it("corpo com album mas sem expiraEm retorna falha: rede", async () => {
    const fetchFn = mockFetch({ album: { capitulos: [], totalDePaginas: 0 } });
    const resultado = await buscarAlbum(sessao, fetchFn);
    expect(resultado).toEqual({ ok: false, falha: "rede" });
  });

  it("usa o apiOrigin na URL", async () => {
    const album = albumVazio();
    const fetchFn = mockFetch({ album });
    await buscarAlbum(sessao, fetchFn);
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining("/api/album"),
      expect.any(Object),
    );
  });
});

describe("thumbDoCaptitulo", () => {
  it("retorna urlThumb da primeira foto da primeira página", () => {
    const capitulo = capituloComFotos();
    expect(thumbDoCaptitulo(capitulo)).toBe("https://cdn.example/thumb.jpg");
  });

  it("retorna null quando não há páginas", () => {
    const capitulo = capituloComFotos({ paginas: [] });
    expect(thumbDoCaptitulo(capitulo)).toBeNull();
  });

  it("retorna null quando a página não tem fotos", () => {
    const capitulo = capituloComFotos({
      paginas: [
        {
          layoutId: "l-1",
          amanhecer: false,
          hora: null,
          inicioDaHora: null,
          lugarId: null,
          fotos: [],
        },
      ],
    });
    expect(thumbDoCaptitulo(capitulo)).toBeNull();
  });
});

describe("totalFotosCapitulo", () => {
  it("soma fotos de todas as páginas", () => {
    const capitulo = capituloComFotos();
    expect(totalFotosCapitulo(capitulo)).toBe(2);
  });

  it("retorna 0 quando não há páginas", () => {
    const capitulo = capituloComFotos({ paginas: [] });
    expect(totalFotosCapitulo(capitulo)).toBe(0);
  });

  it("soma corretamente com múltiplas páginas", () => {
    const paginaBase = {
      layoutId: "l-1",
      amanhecer: false,
      hora: null,
      inicioDaHora: null,
      lugarId: null,
    };
    const foto = {
      id: "f-x",
      url: "https://cdn.example/f.jpg",
      urlThumb: "https://cdn.example/t.jpg",
      missaoId: null,
      slot: { id: "s-x", proporcao: "4/5", fracao: 1 },
    };
    const capitulo = capituloComFotos({
      paginas: [
        { ...paginaBase, fotos: [foto, foto] },
        { ...paginaBase, fotos: [foto] },
        { ...paginaBase, fotos: [foto, foto, foto] },
      ],
    });
    expect(totalFotosCapitulo(capitulo)).toBe(6);
  });
});
