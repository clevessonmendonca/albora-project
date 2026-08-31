import { describe, expect, it, vi } from "vitest";
import { fetchMissoes } from "./missions";
import type { GuestSession } from "./session";

const sessao: GuestSession = {
  token: "tok.x",
  slug: "festa-demo",
  sessaoId: "sess-1",
  eventoId: "ev-abc",
};

function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe("fetchMissoes", () => {
  it("retorna missões com feito corretamente", async () => {
    const fetch = mockFetch({
      missoes: [
        { id: "m1", titulo: "Dança dos padrinhos", feito: true },
        { id: "m2", titulo: "Primeira dança", feito: false },
      ],
    });

    const result = await fetchMissoes(sessao, fetch);

    expect(result.missoes).toHaveLength(2);
    expect(result.missoes[0]).toEqual({ id: "m1", titulo: "Dança dos padrinhos", feito: true });
    expect(result.missoes[1]).toEqual({ id: "m2", titulo: "Primeira dança", feito: false });
  });

  it("envia eventoId e cookie corretos na requisição", async () => {
    const fetch = mockFetch({ missoes: [] });

    await fetchMissoes(sessao, fetch);

    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/api/missions");
    expect(url).toContain("eventoId=ev-abc");
    expect((opts.headers as Record<string, string>)["cookie"]).toContain("tok.x");
  });

  it("retorna lista vazia quando servidor devolve missoes: []", async () => {
    const fetch = mockFetch({ missoes: [] });

    const result = await fetchMissoes(sessao, fetch);

    expect(result.missoes).toEqual([]);
  });

  it("retorna lista vazia quando campo missoes ausente", async () => {
    const fetch = mockFetch({});

    const result = await fetchMissoes(sessao, fetch);

    expect(result.missoes).toEqual([]);
  });

  it("lança erro quando status não é 2xx", async () => {
    const fetch = mockFetch({ code: "sessao.invalida" }, 401);

    await expect(fetchMissoes(sessao, fetch)).rejects.toThrow("missions 401");
  });

  it("lança erro em status 500", async () => {
    const fetch = mockFetch({ code: "erro.interno" }, 500);

    await expect(fetchMissoes(sessao, fetch)).rejects.toThrow("missions 500");
  });
});
