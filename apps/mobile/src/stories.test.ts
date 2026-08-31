import { describe, expect, it, vi } from "vitest";
import { fetchStories, type StoryItem } from "./stories";
import type { GuestSession } from "./session";

const sessao: GuestSession = {
  token: "tok.x",
  slug: "festa-demo",
  sessaoId: "sess-1",
  eventoId: "ev-1",
};

const storiesBody = {
  itens: [
    { id: "s-1", autor: "Ana", chaveThumb: "events/ev-1/thumb/a.jpg" },
    { id: "s-2", autor: "Bruno", chaveThumb: "events/ev-1/thumb/b.jpg" },
  ],
};

const urlsBody = {
  urls: [
    { chave: "events/ev-1/thumb/a.jpg", url: "https://cdn.example/a.jpg?sig=1" },
    { chave: "events/ev-1/thumb/b.jpg", url: "https://cdn.example/b.jpg?sig=2" },
  ],
};

function mockFetch(responses: Record<string, unknown>, status = 200): typeof fetch {
  return vi.fn().mockImplementation((input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const body = Object.entries(responses).find(([k]) => url.includes(k))?.[1] ?? {};
    const ok = status >= 200 && status < 300;
    return Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(body),
    });
  }) as unknown as typeof fetch;
}

describe("fetchStories", () => {
  it("retorna itens com thumbUrl quando API e signing respondem OK", async () => {
    const fetchFn = mockFetch({
      "/api/stories": storiesBody,
      "/api/media/urls": urlsBody,
    });

    const result = await fetchStories(sessao, fetchFn);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual<StoryItem>({
      id: "s-1",
      autor: "Ana",
      chaveThumb: "events/ev-1/thumb/a.jpg",
      thumbUrl: "https://cdn.example/a.jpg?sig=1",
    });
    expect(result[1]).toEqual<StoryItem>({
      id: "s-2",
      autor: "Bruno",
      chaveThumb: "events/ev-1/thumb/b.jpg",
      thumbUrl: "https://cdn.example/b.jpg?sig=2",
    });
  });

  it("inclui eventoId no cookie de autenticação", async () => {
    const fetchFn = mockFetch({
      "/api/stories": storiesBody,
      "/api/media/urls": urlsBody,
    });

    await fetchStories(sessao, fetchFn);

    const chamadas = (fetchFn as ReturnType<typeof vi.fn>).mock.calls as [string | URL | Request, ...unknown[]][];
    const storiesCall = chamadas.find(([u]) => {
      const url = typeof u === "string" ? u : u instanceof URL ? u.toString() : (u as Request).url;
      return url.includes("/api/stories");
    });
    expect(storiesCall).toBeDefined();
    const opts = storiesCall?.[1] as { headers?: { cookie?: string } } | undefined;
    expect(opts?.headers?.cookie).toContain("tok.x");
  });

  it("retorna lista vazia quando /api/stories responde com erro 4xx", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    const result = await fetchStories(sessao, fetchFn);

    expect(result).toEqual([]);
  });

  it("retorna lista vazia quando /api/stories responde com erro 5xx", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    const result = await fetchStories(sessao, fetchFn);

    expect(result).toEqual([]);
  });

  it("retorna lista vazia quando há erro de rede (throw)", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const result = await fetchStories(sessao, fetchFn);

    expect(result).toEqual([]);
  });

  it("retorna itens sem thumbUrl quando signing falha", async () => {
    const fetchFn = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      if (url.includes("/api/stories")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(storiesBody),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });
    }) as unknown as typeof fetch;

    const result = await fetchStories(sessao, fetchFn);

    expect(result).toHaveLength(2);
    expect(result[0]?.thumbUrl).toBeUndefined();
    expect(result[1]?.thumbUrl).toBeUndefined();
    expect(result[0]?.id).toBe("s-1");
  });

  it("retorna lista vazia quando corpo de /api/stories não tem campo itens", async () => {
    const fetchFn = mockFetch({ "/api/stories": { outro: "campo" } });

    const result = await fetchStories(sessao, fetchFn);

    expect(result).toEqual([]);
  });

  it("retorna lista vazia quando itens é array vazio", async () => {
    const fetchFn = mockFetch({
      "/api/stories": { itens: [] },
      "/api/media/urls": urlsBody,
    });

    const result = await fetchStories(sessao, fetchFn);

    expect(result).toEqual([]);
  });

  it("omite thumbUrl apenas para a chave sem assinatura, mantendo outras", async () => {
    const fetchFn = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      if (url.includes("/api/stories")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              itens: [
                { id: "s-1", autor: "Ana", chaveThumb: "events/ev-1/thumb/a.jpg" },
                { id: "s-2", autor: "Bruno", chaveThumb: "events/ev-1/thumb/b.jpg" },
              ],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            urls: [{ chave: "events/ev-1/thumb/a.jpg", url: "https://cdn.example/a.jpg?sig=1" }],
          }),
      });
    }) as unknown as typeof fetch;

    const result = await fetchStories(sessao, fetchFn);

    expect(result).toHaveLength(2);
    expect(result[0]?.thumbUrl).toBe("https://cdn.example/a.jpg?sig=1");
    expect(result[1]?.thumbUrl).toBeUndefined();
  });
});
