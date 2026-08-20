import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiModule from "@/lib/api";

const EVENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SESSION_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const UPLOAD_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const VALID_FULL = `events/${EVENT_ID}/2026/01/${UPLOAD_ID}/full`;
const VALID_THUMB = `events/${EVENT_ID}/2026/01/${UPLOAD_ID}/thumb`;

const { requireGuestSession, enforceRateLimit, requireConfig } = vi.hoisted(() => ({
  requireGuestSession: vi.fn(),
  enforceRateLimit: vi.fn(),
  requireConfig: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, requireGuestSession, enforceRateLimit, requireConfig };
});

const { withEvent, signableKeys } = vi.hoisted(() => ({
  withEvent: vi.fn(),
  signableKeys: vi.fn(),
}));

vi.mock("@albora/db", () => ({ withEvent, signableKeys }));

vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));

const { assinarGet } = vi.hoisted(() => ({ assinarGet: vi.fn() }));
vi.mock("@/lib/r2", () => ({ assinarGet }));

const { consume } = vi.hoisted(() => ({ consume: vi.fn() }));
vi.mock("@/lib/rate-limit-store", () => ({ consume }));

const { POST } = await import("./route");

function req(chaves: unknown = [VALID_FULL]) {
  return new Request("https://exemplo.test/api/media/urls", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chaves }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireConfig.mockReturnValue(null);
  requireGuestSession.mockResolvedValue({
    session: { eventoId: EVENT_ID, sessaoId: SESSION_ID },
  });
  enforceRateLimit.mockReturnValue(null);
  consume.mockReturnValue({ allowed: true, remaining: 119, resetInSeconds: 60 });
  withEvent.mockImplementation((_pool: unknown, _id: unknown, fn: (c: unknown) => unknown) =>
    fn({}),
  );
  signableKeys.mockResolvedValue(new Set([VALID_FULL]));
  assinarGet.mockResolvedValue("https://cdn.exemplo.test/signed-url");
});

describe("POST /api/media/urls — gate de moderação", () => {
  it("emite URLs quando todos os uploads estão publicados", async () => {
    const res = await POST(req([VALID_FULL]));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { urls: { chave: string; url: string }[] };
    expect(body.urls).toHaveLength(1);
    expect(body.urls[0]!.chave).toBe(VALID_FULL);
    expect(signableKeys).toHaveBeenCalledWith({}, EVENT_ID, [VALID_FULL]);
  });

  it("aceita chave /thumb e passa para signableKeys na forma original", async () => {
    signableKeys.mockResolvedValue(new Set([VALID_THUMB]));
    const res = await POST(req([VALID_THUMB]));
    expect(res.status).toBe(200);
    expect(signableKeys).toHaveBeenCalledWith({}, EVENT_ID, [VALID_THUMB]);
  });

  it("403 midia.chave_invalida quando upload não está publicado (removed)", async () => {
    signableKeys.mockResolvedValue(new Set()); // nenhuma signable
    const res = await POST(req([VALID_FULL]));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("midia.chave_invalida");
  });

  it("403 midia.chave_invalida quando evento está em pânico", async () => {
    signableKeys.mockResolvedValue(new Set()); // pânico → set vazio
    const res = await POST(req([VALID_FULL]));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("midia.chave_invalida");
  });

  it("403 indistinguível: removed e pânico retornam o mesmo código", async () => {
    signableKeys.mockResolvedValue(new Set());
    const removedRes = await POST(req([VALID_FULL]));
    const removedBody = (await removedRes.json()) as { code: string };

    signableKeys.mockResolvedValue(new Set());
    const panicRes = await POST(req([VALID_FULL]));
    const panicBody = (await panicRes.json()) as { code: string };

    expect(removedBody.code).toBe(panicBody.code);
    expect(removedBody.code).toBe("midia.chave_invalida");
  });

  it("403 quando qualquer chave do lote não é signable (não assina parcialmente)", async () => {
    signableKeys.mockResolvedValue(new Set([VALID_FULL])); // só full signable, thumb não
    const res = await POST(req([VALID_FULL, VALID_THUMB]));
    expect(res.status).toBe(403);
    expect(assinarGet).not.toHaveBeenCalled();
  });

  it("não chama signableKeys quando validateBatch já rejeita", async () => {
    const res = await POST(req(["chave-invalida"]));
    expect(res.status).toBe(403);
    expect(signableKeys).not.toHaveBeenCalled();
  });

  it("sem sessão: 401", async () => {
    requireGuestSession.mockResolvedValue(
      Response.json({ code: "sessao.invalida" }, { status: 401 }),
    );
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(signableKeys).not.toHaveBeenCalled();
  });

  it("rate limit: 429", async () => {
    enforceRateLimit.mockReturnValue(Response.json({ code: "rate_limit" }, { status: 429 }));
    const res = await POST(req());
    expect(res.status).toBe(429);
    expect(signableKeys).not.toHaveBeenCalled();
  });
});
