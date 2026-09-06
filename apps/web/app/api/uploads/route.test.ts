import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiModule from "@/lib/api";

/** Remoção da própria mídia pelo convidado (spec 008, ADR 0004). `removerUploadProprio` só marca
 * `state = 'removed'` quando `id` E `session_id` batem com a sessão autenticada — mídia de outro
 * convidado (ou inexistente) não afeta linha nenhuma e a rota recusa a remoção. */

const EVENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SESSION_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const UPLOAD_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const INEXISTENTE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const { requireGuestSession, enforceRateLimit, parseJsonBody } = vi.hoisted(() => ({
  requireGuestSession: vi.fn(),
  enforceRateLimit: vi.fn(),
  parseJsonBody: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, requireGuestSession, enforceRateLimit, parseJsonBody };
});

const { withEvent, removerUploadProprio } = vi.hoisted(() => ({
  withEvent: vi.fn(),
  removerUploadProprio: vi.fn(),
}));

vi.mock("@albora/db", () => ({ withEvent, removerUploadProprio }));

vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));

const { DELETE } = await import("./route");

function req(body: unknown) {
  return new Request("https://exemplo.test/api/uploads", {
    method: "DELETE",
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
  parseJsonBody.mockResolvedValue({ data: { uploadId: UPLOAD_ID } });
  withEvent.mockImplementation(async (_pool: unknown, _eventId: unknown, fn: (c: unknown) => Promise<unknown>) =>
    fn({}),
  );
  removerUploadProprio.mockResolvedValue(true);
});

describe("DELETE /api/uploads", () => {
  it("sessão de convidado ausente ou inválida → 401, devolvido tal e qual", async () => {
    requireGuestSession.mockResolvedValue(
      Response.json({ code: "sessao.invalida", message: "Sessão inválida" }, { status: 401 }),
    );

    const res = await DELETE(req({ uploadId: UPLOAD_ID }));

    expect(res.status).toBe(401);
    expect(removerUploadProprio).not.toHaveBeenCalled();
  });

  it("rate limit excedido → resposta de limite, sem remover", async () => {
    enforceRateLimit.mockReturnValue(
      Response.json({ code: "limite.excedido", message: "Espere um instante" }, { status: 429 }),
    );

    const res = await DELETE(req({ uploadId: UPLOAD_ID }));

    expect(res.status).toBe(429);
    expect(removerUploadProprio).not.toHaveBeenCalled();
  });

  it("payload inválido (uploadId malformado) → 422 validation_error", async () => {
    parseJsonBody.mockResolvedValue({ data: { uploadId: "nao-e-um-uuid" } });

    const res = await DELETE(req({ uploadId: "nao-e-um-uuid" }));

    expect(res.status).toBe(422);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("validation_error");
    expect(removerUploadProprio).not.toHaveBeenCalled();
  });

  it("o convidado remove a própria mídia → 200 removido true", async () => {
    const res = await DELETE(req({ uploadId: UPLOAD_ID }));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { uploadId: string; removido: boolean };
    expect(body.uploadId).toBe(UPLOAD_ID);
    expect(body.removido).toBe(true);
    expect(removerUploadProprio).toHaveBeenCalledWith(expect.anything(), UPLOAD_ID, SESSION_ID);
  });

  it("não consegue remover mídia de outro convidado (session_id não bate) → 403 upload.remover_negado", async () => {
    removerUploadProprio.mockResolvedValue(false);

    const res = await DELETE(req({ uploadId: UPLOAD_ID }));

    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("upload.remover_negado");
  });

  it("mídia inexistente → nenhuma linha afetada → 403 upload.remover_negado (não vaza se existe)", async () => {
    parseJsonBody.mockResolvedValue({ data: { uploadId: INEXISTENTE_ID } });
    removerUploadProprio.mockResolvedValue(false);

    const res = await DELETE(req({ uploadId: INEXISTENTE_ID }));

    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("upload.remover_negado");
  });

  it("erro inesperado → 500 erro.interno", async () => {
    removerUploadProprio.mockRejectedValue(new Error("banco fora do ar"));

    const res = await DELETE(req({ uploadId: UPLOAD_ID }));

    expect(res.status).toBe(500);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("erro.interno");
  });
});
