import { describe, expect, it, vi } from "vitest";
import { reportMedia } from "./report";

const SESSAO = {
  token: "tok.abc",
  slug: "festa-demo",
  sessaoId: "sess-1",
  eventoId: "ev-1",
};

const UPLOAD_ID = "44444444-4444-4444-4444-444444444444";

function mockFetch(status: number): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({}),
  }) as unknown as typeof fetch;
}

describe("reportMedia", () => {
  it("retorna true em 200", async () => {
    expect(await reportMedia(SESSAO, UPLOAD_ID, "ofensivo", undefined, mockFetch(200))).toBe(true);
  });

  it("retorna false em 401 — falha fechado", async () => {
    expect(await reportMedia(SESSAO, UPLOAD_ID, "ofensivo", undefined, mockFetch(401))).toBe(false);
  });

  it("retorna false em 403", async () => {
    expect(await reportMedia(SESSAO, UPLOAD_ID, "ofensivo", undefined, mockFetch(403))).toBe(false);
  });

  it("retorna false offline", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch;
    expect(await reportMedia(SESSAO, UPLOAD_ID, "ofensivo", undefined, fetchFn)).toBe(false);
  });

  it("envia kind e motivo quando ofensivo com texto", async () => {
    const fetchFn = mockFetch(200);
    await reportMedia(SESSAO, UPLOAD_ID, "ofensivo", "Imagem inapropriada", fetchFn);
    const body = JSON.parse(
      ((fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as Record<string, unknown>;
    expect(body.kind).toBe("ofensivo");
    expect(body.motivo).toBe("Imagem inapropriada");
  });

  it("omite motivo quando kind é aparece_na_foto", async () => {
    const fetchFn = mockFetch(200);
    await reportMedia(SESSAO, UPLOAD_ID, "aparece_na_foto", "algum texto", fetchFn);
    const body = JSON.parse(
      ((fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as Record<string, unknown>;
    expect(body.kind).toBe("aparece_na_foto");
    expect(body.motivo).toBeUndefined();
  });

  it("inclui cookie e eventoId no request", async () => {
    const fetchFn = mockFetch(200);
    await reportMedia(SESSAO, UPLOAD_ID, "ofensivo", undefined, fetchFn);
    const [url, init] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/media\/report$/);
    expect((init.headers as Record<string, string>)["cookie"]).toContain("albora_sessao=tok.abc");
    const body = JSON.parse(init.body as string) as Record<string, string>;
    expect(body.eventoId).toBe("ev-1");
  });
});
