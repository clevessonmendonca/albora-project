import { describe, expect, it, vi } from "vitest";
import { listComments, postComment, deleteComment } from "./comments";

const SESSAO = {
  token: "tok.abc",
  slug: "festa-demo",
  sessaoId: "sess-1",
  eventoId: "ev-1",
};

const UPLOAD_ID = "22222222-2222-2222-2222-222222222222";
const COMENTARIO_ID = "33333333-3333-3333-3333-333333333333";

function mockFetch(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

const threadExemplo = {
  id: COMENTARIO_ID,
  autor: "Maria",
  texto: "Linda!",
  criadaEm: "2026-08-01T22:00:00Z",
  meu: false,
  sessaoAutor: "sess-2",
  respostas: [],
};

describe("listComments", () => {
  it("retorna threads em resposta 200", async () => {
    const fetchFn = mockFetch(200, { threads: [threadExemplo] });
    const resultado = await listComments(SESSAO, UPLOAD_ID, fetchFn);
    expect(resultado.threads).toHaveLength(1);
    expect(resultado.threads[0]?.texto).toBe("Linda!");
  });

  it("retorna lista vazia em 401 — falha fechado", async () => {
    const fetchFn = mockFetch(401, {});
    expect((await listComments(SESSAO, UPLOAD_ID, fetchFn)).threads).toHaveLength(0);
  });

  it("retorna lista vazia em 403", async () => {
    const fetchFn = mockFetch(403, {});
    expect((await listComments(SESSAO, UPLOAD_ID, fetchFn)).threads).toHaveLength(0);
  });

  it("retorna lista vazia offline", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch;
    expect((await listComments(SESSAO, UPLOAD_ID, fetchFn)).threads).toHaveLength(0);
  });

  it("inclui upload_id e cookie na URL/headers", async () => {
    const fetchFn = mockFetch(200, { threads: [] });
    await listComments(SESSAO, UPLOAD_ID, fetchFn);
    const [url, init] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`upload_id=${UPLOAD_ID}`);
    expect((init.headers as Record<string, string>)["cookie"]).toContain("albora_sessao=tok.abc");
  });
});

describe("postComment", () => {
  it("envia POST e retorna id em sucesso", async () => {
    const fetchFn = mockFetch(201, { id: COMENTARIO_ID });
    const resultado = await postComment(SESSAO, UPLOAD_ID, "Que foto!", null, fetchFn);
    expect(resultado).toEqual({ id: COMENTARIO_ID });
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatchObject({ method: "POST" });
  });

  it("retorna null em 403 — gate fechado", async () => {
    const fetchFn = mockFetch(403, {});
    expect(await postComment(SESSAO, UPLOAD_ID, "Oi", null, fetchFn)).toBeNull();
  });

  it("retorna null offline", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch;
    expect(await postComment(SESSAO, UPLOAD_ID, "Oi", null, fetchFn)).toBeNull();
  });

  it("inclui respostaA quando fornecido", async () => {
    const fetchFn = mockFetch(201, { id: COMENTARIO_ID });
    await postComment(SESSAO, UPLOAD_ID, "Haha", COMENTARIO_ID, fetchFn);
    const body = JSON.parse(
      ((fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as Record<string, unknown>;
    expect(body.respostaA).toBe(COMENTARIO_ID);
  });
});

describe("deleteComment", () => {
  it("retorna true em 200", async () => {
    const fetchFn = mockFetch(200, { removido: true });
    expect(await deleteComment(SESSAO, COMENTARIO_ID, fetchFn)).toBe(true);
  });

  it("retorna false em 403", async () => {
    const fetchFn = mockFetch(403, {});
    expect(await deleteComment(SESSAO, COMENTARIO_ID, fetchFn)).toBe(false);
  });

  it("retorna false offline", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch;
    expect(await deleteComment(SESSAO, COMENTARIO_ID, fetchFn)).toBe(false);
  });
});
