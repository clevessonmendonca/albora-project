import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiModule from "@/lib/api";

/** Legenda e lugar são gravados só via `session_id` da própria sessão (RLS já escopa por `event_id`) —
 * mídia de outra sessão/evento não aparece pro UPDATE e `anotarUpload` devolve 0 linhas afetadas. */

const EVENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SESSION_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const UPLOAD_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const { requireGuestSession, enforceRateLimit, parseJsonBody } = vi.hoisted(() => ({
  requireGuestSession: vi.fn(),
  enforceRateLimit: vi.fn(),
  parseJsonBody: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, requireGuestSession, enforceRateLimit, parseJsonBody };
});

const { withEvent, annotateUpload, eventPack } = vi.hoisted(() => ({
  withEvent: vi.fn(),
  annotateUpload: vi.fn(),
  eventPack: vi.fn(),
}));

vi.mock("@albora/db", () => ({ withEvent, annotateUpload, eventPack }));

vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));

const { cleanCaption, acceptedPlace } = vi.hoisted(() => ({
  cleanCaption: vi.fn((v: unknown) => (typeof v === "string" ? v : null)),
  acceptedPlace: vi.fn(() => null),
}));

vi.mock("@/lib/details", () => ({ cleanCaption, acceptedPlace }));

const { POST } = await import("./route");

function req(body: unknown) {
  return new Request("https://exemplo.test/api/uploads/detalhes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireGuestSession.mockResolvedValue({
    session: { eventoId: EVENT_ID, sessaoId: SESSION_ID },
  });
  enforceRateLimit.mockReturnValue(null);
  parseJsonBody.mockResolvedValue({
    data: { uploadId: UPLOAD_ID, legenda: "que festa", lugar: null },
  });
  withEvent.mockImplementation(async (_pool: unknown, _eventId: unknown, fn: (c: unknown) => Promise<unknown>) =>
    fn({}),
  );
  eventPack.mockResolvedValue(null);
  annotateUpload.mockResolvedValue(true);
});

describe("POST /api/uploads/detalhes", () => {
  it("sessão de convidado ausente ou inválida → 401, devolvido tal e qual", async () => {
    requireGuestSession.mockResolvedValue(
      Response.json({ code: "sessao.invalida", message: "Sessão inválida" }, { status: 401 }),
    );

    const res = await POST(req({ uploadId: UPLOAD_ID, legenda: "x" }));

    expect(res.status).toBe(401);
    expect(annotateUpload).not.toHaveBeenCalled();
  });

  it("rate limit excedido → resposta de limite, sem anotar", async () => {
    enforceRateLimit.mockReturnValue(
      Response.json({ code: "limite.excedido", message: "Espere um instante" }, { status: 429 }),
    );

    const res = await POST(req({ uploadId: UPLOAD_ID, legenda: "x" }));

    expect(res.status).toBe(429);
    expect(annotateUpload).not.toHaveBeenCalled();
  });

  it("payload inválido (uploadId ausente) → 422 validation_error", async () => {
    parseJsonBody.mockResolvedValue({ data: { legenda: "sem id" } });

    const res = await POST(req({ legenda: "sem id" }));

    expect(res.status).toBe(422);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("validation_error");
    expect(annotateUpload).not.toHaveBeenCalled();
  });

  it("payload inválido (uploadId não é uuid) → 422 validation_error", async () => {
    parseJsonBody.mockResolvedValue({ data: { uploadId: "nao-e-um-uuid", legenda: "x" } });

    const res = await POST(req({ uploadId: "nao-e-um-uuid", legenda: "x" }));

    expect(res.status).toBe(422);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("validation_error");
  });

  it("caminho feliz: anota legenda e lugar da própria sessão → 200 anotado true", async () => {
    const res = await POST(req({ uploadId: UPLOAD_ID, legenda: "que festa", lugar: "salão" }));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { uploadId: string; anotado: boolean };
    expect(body.uploadId).toBe(UPLOAD_ID);
    expect(body.anotado).toBe(true);
    expect(annotateUpload).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ uploadId: UPLOAD_ID, sessionId: SESSION_ID }),
    );
  });

  it("mídia de outro evento/sessão → UPDATE não encontra a linha (RLS+session_id) → 200 anotado false, nada muda", async () => {
    annotateUpload.mockResolvedValue(false);

    const res = await POST(req({ uploadId: UPLOAD_ID, legenda: "tentando mexer no que não é meu" }));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { uploadId: string; anotado: boolean };
    expect(body.anotado).toBe(false);
  });

  it("erro inesperado → 500 erro.interno", async () => {
    annotateUpload.mockRejectedValue(new Error("banco fora do ar"));

    const res = await POST(req({ uploadId: UPLOAD_ID, legenda: "x" }));

    expect(res.status).toBe(500);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("erro.interno");
  });
});
