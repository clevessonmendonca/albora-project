import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarStories, paraStoryItem, useStories, type StoryDaRede } from "./use-stories";
import type { MediaUrl } from "@/lib/media";

function responder(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status });
}

function story(id: string, autor: string): StoryDaRede {
  return { id, autor, chaveThumb: `events/e/${id}/thumb` };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("buscarStories", () => {
  it("devolve os itens da resposta", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => responder({ itens: [story("s1", "Ana")] })));

    expect(await buscarStories()).toEqual([story("s1", "Ana")]);
  });

  it("resposta que não é 2xx degrada para lista vazia, sem lançar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => responder({ code: "sessao.invalida" }, 401)));

    expect(await buscarStories()).toEqual([]);
  });

  it("falha de rede degrada para lista vazia, sem lançar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("rede fora");
      }),
    );

    expect(await buscarStories()).toEqual([]);
  });

  it("corpo sem `itens` degrada para lista vazia", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => responder({})));

    expect(await buscarStories()).toEqual([]);
  });
});

describe("paraStoryItem", () => {
  it("nome vem do autor (primeiro nome), capaUrl vem do mapa de URLs pela chave", () => {
    const urls = new Map<string, MediaUrl>([
      ["events/e/s1/thumb", { chave: "events/e/s1/thumb", url: "https://r2/s1", expiraEm: 0 }],
    ]);

    expect(paraStoryItem(story("s1", "Ana"), urls)).toEqual({
      id: "s1",
      nome: "Ana",
      capaUrl: "https://r2/s1",
    });
  });

  it("sem URL ainda resolvida, capaUrl fica undefined — StoryRail cai nas iniciais", () => {
    expect(paraStoryItem(story("s1", "Ana"), new Map())).toEqual({
      id: "s1",
      nome: "Ana",
      capaUrl: undefined,
    });
  });
});

describe("useStories", () => {
  it("busca as stories e depois as URLs de miniatura, num segundo lote", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/stories") {
        return responder({ itens: [story("s1", "Ana"), story("s2", "Bia")] });
      }
      if (url === "/api/media/urls") {
        const corpo = JSON.parse(String(init?.body)) as { chaves: string[] };
        return responder({
          urls: corpo.chaves.map((chave) => ({ chave, url: `https://r2/${chave}`, expiraEm: Date.now() + 60_000 })),
        });
      }
      throw new Error(`fetch inesperado: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStories());

    expect(result.current.carregado).toBe(false);
    expect(result.current.itens).toEqual([]);

    await waitFor(() => expect(result.current.carregado).toBe(true));

    expect(result.current.itens).toEqual([story("s1", "Ana"), story("s2", "Bia")]);

    await waitFor(() => expect(result.current.urls.size).toBe(2));
    expect(result.current.urls.get("events/e/s1/thumb")?.url).toBe("https://r2/events/e/s1/thumb");
  });

  it("sem stories, não pede URL nenhuma — zero requisição a mais", async () => {
    const fetchMock = vi.fn(async () => responder({ itens: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStories());

    await waitFor(() => expect(result.current.carregado).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.urls.size).toBe(0);
  });

  it("busca de stories falhando degrada: carregado=true, itens vazios, Home não trava", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("rede fora");
      }),
    );

    const { result } = renderHook(() => useStories());

    await waitFor(() => expect(result.current.carregado).toBe(true));
    expect(result.current.itens).toEqual([]);
  });

  it("busca de URL falhando não derruba as stories já carregadas", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/stories") return responder({ itens: [story("s1", "Ana")] });
      if (url === "/api/media/urls") return responder({ code: "midia.indisponivel" }, 500);
      throw new Error(`fetch inesperado: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStories());

    await waitFor(() => expect(result.current.carregado).toBe(true));

    expect(result.current.itens).toEqual([story("s1", "Ana")]);
    await act(async () => {});
    expect(result.current.urls.size).toBe(0);
  });
});
