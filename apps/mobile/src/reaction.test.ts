import { describe, expect, it, vi } from "vitest";
import { toggleReaction } from "./reaction";

const SESSAO = {
  token: "tok.abc",
  slug: "festa-demo",
  sessaoId: "sess-1",
  eventoId: "ev-1",
};

const UPLOAD_ID = "11111111-1111-1111-1111-111111111111";

function mockFetch(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe("toggleReaction", () => {
  it("envia PUT ao reagir pela primeira vez e retorna resultado", async () => {
    const fetchFn = mockFetch(200, { reacoes: 1, minha: "estrela" });
    const resultado = await toggleReaction(SESSAO, UPLOAD_ID, null, fetchFn);
    expect(resultado).toEqual({ reacoes: 1, minha: "estrela" });
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatchObject({
      method: "PUT",
    });
  });

  it("envia DELETE ao remover reação existente", async () => {
    const fetchFn = mockFetch(200, { reacoes: 0, minha: null });
    const resultado = await toggleReaction(SESSAO, UPLOAD_ID, "estrela", fetchFn);
    expect(resultado).toEqual({ reacoes: 0, minha: null });
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatchObject({
      method: "DELETE",
    });
  });

  it("retorna null em 401 — falha fechado", async () => {
    const fetchFn = mockFetch(401, {});
    expect(await toggleReaction(SESSAO, UPLOAD_ID, null, fetchFn)).toBeNull();
  });

  it("retorna null em 403", async () => {
    const fetchFn = mockFetch(403, {});
    expect(await toggleReaction(SESSAO, UPLOAD_ID, null, fetchFn)).toBeNull();
  });

  it("retorna null offline (exceção de rede)", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch;
    expect(await toggleReaction(SESSAO, UPLOAD_ID, null, fetchFn)).toBeNull();
  });

  it("inclui eventoId e cookie no request", async () => {
    const fetchFn = mockFetch(200, { reacoes: 1, minha: "estrela" });
    await toggleReaction(SESSAO, UPLOAD_ID, null, fetchFn);
    const [url, init] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/reaction$/);
    expect((init.headers as Record<string, string>)["cookie"]).toContain("albora_sessao=tok.abc");
    const body = JSON.parse(init.body as string) as Record<string, string>;
    expect(body.uploadId).toBe(UPLOAD_ID);
    expect(body.eventoId).toBe("ev-1");
  });
});
