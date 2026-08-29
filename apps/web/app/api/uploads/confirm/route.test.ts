import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiModule from "@/lib/api";

/** Valida magic bytes da thumb (§10/9) — mesmo portão que `full`; 16 bytes (PREFIXO_MAGIC_BYTES) cobrem todos os formatos. */

const EVENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SESSION_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const UPLOAD_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CHAVE = `events/${EVENT_ID}/2026/08/${SESSION_ID}`;

/** JPEG: 0xFF 0xD8 0xFF + padding */
const JPEG_INICIO = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

/** O vetor real de XSS armazenado. */
const HTML_INICIO = new Uint8Array([...Buffer.from("<!DOCTYPE html><scr")]);

const { inspecionarObjeto } = vi.hoisted(() => ({
  inspecionarObjeto: vi.fn(),
}));

vi.mock("@/lib/r2", () => ({ inspecionarObjeto }));

const { requireGuestSession, enforceRateLimit, requireConfig, parseJsonBody } = vi.hoisted(() => ({
  requireGuestSession: vi.fn(),
  enforceRateLimit: vi.fn(),
  requireConfig: vi.fn(() => null),
  parseJsonBody: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, requireGuestSession, enforceRateLimit, requireConfig, parseJsonBody };
});

vi.mock("@albora/core", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, prefixoDoEvento: (_id: string) => `events/${_id}/` };
});

const { withEvent, confirmUpload, challengeBelongsToEvent, eventTimeZone, eventPack, planoDoEvento } =
  vi.hoisted(() => ({
    withEvent: vi.fn(),
    confirmUpload: vi.fn(),
    challengeBelongsToEvent: vi.fn(),
    eventTimeZone: vi.fn(),
    eventPack: vi.fn(),
    planoDoEvento: vi.fn(),
  }));

vi.mock("@albora/db", () => ({
  withEvent,
  confirmUpload,
  challengeBelongsToEvent,
  eventTimeZone,
  eventPack,
  planoDoEvento,
  UploadConflictError: class UploadConflictError extends Error {},
}));

vi.mock("@albora/packs", () => ({
  isValidConfessionPrompt: vi.fn(() => false),
  PACKS: {},
}));

vi.mock("@/features/guest/lib/record-funnel", () => ({
  recordFunnelEvent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({}),
}));

vi.mock("@/lib/application/use-cases/guest", () => ({
  confirmUpload,
}));

vi.mock("@/lib/details", () => ({
  cleanCaption: (v: unknown) => v ?? null,
  acceptedPlace: () => null,
  acceptedTakenAt: () => null,
  acceptedTakenAtInTimeZone: () => null,
  acceptedSize: () => null,
}));

const { consume } = vi.hoisted(() => ({ consume: vi.fn() }));
vi.mock("@/lib/rate-limit-store", () => ({ consume }));

const { POST } = await import("./route");

function req(body: unknown = { uploadId: UPLOAD_ID, chave: CHAVE, mime: "image/jpeg" }) {
  return new Request("https://exemplo.test/api/uploads/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireConfig.mockReturnValue(null);
  requireGuestSession.mockResolvedValue({
    session: { eventoId: EVENT_ID, sessaoId: SESSION_ID },
  });
  enforceRateLimit.mockReturnValue(null);
  parseJsonBody.mockResolvedValue({
    data: { uploadId: UPLOAD_ID, chave: CHAVE, mime: "image/jpeg" },
  });
  consume.mockReturnValue({ allowed: true, remaining: 19, resetInSeconds: 60 });
  eventTimeZone.mockResolvedValue("America/Sao_Paulo");
  eventPack.mockResolvedValue(null);
  planoDoEvento.mockResolvedValue("free");
});

describe("POST /api/uploads/confirm — validação da thumb (§10 item 9)", () => {
  it("thumb ausente → 409 upload.thumb_ausente", async () => {
    inspecionarObjeto.mockImplementation(async (key: string) => {
      if (key.endsWith("/full")) return { bytes: 800_000, inicio: JPEG_INICIO };
      return null;
    });

    const res = await POST(req());

    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string; details: { chave: string } };
    expect(body.code).toBe("upload.thumb_ausente");
    expect(body.details.chave).toBe(`${CHAVE}/thumb`);
  });

  it("thumb com conteúdo HTML → 422 midia.conteudo_nao_confere", async () => {
    inspecionarObjeto.mockImplementation(async (key: string) => {
      if (key.endsWith("/full")) return { bytes: 800_000, inicio: JPEG_INICIO };
      return { bytes: 5_000, inicio: HTML_INICIO };
    });
    confirmUpload.mockResolvedValue({
      ok: false,
      code: "midia.conteudo_nao_confere",
      message: "Arquivo recusado",
    });

    const res = await POST(req());

    expect(res.status).toBe(422);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("midia.conteudo_nao_confere");
  });

  it("thumb JPEG válida → confirm completo com 200", async () => {
    inspecionarObjeto.mockImplementation(async (key: string) => {
      if (key.endsWith("/full")) return { bytes: 800_000, inicio: JPEG_INICIO };
      return { bytes: 30_000, inicio: JPEG_INICIO };
    });

    withEvent.mockImplementation(async (_pool: unknown, _eventId: unknown, fn: (c: unknown) => Promise<unknown>) =>
      fn({ query: vi.fn().mockResolvedValue({ rows: [] }) }),
    );
    confirmUpload.mockResolvedValue({ ok: true, uploadId: UPLOAD_ID, estado: "criado" });

    const res = await POST(req());

    expect(res.status).toBe(200);
    const body = (await res.json()) as { uploadId: string; estado: string };
    expect(body.uploadId).toBe(UPLOAD_ID);
    expect(body.estado).toBe("criado");
  });

  it("thumb de vídeo (poster JPEG) → aceito como image/jpeg", async () => {
    inspecionarObjeto.mockImplementation(async (key: string) => {
      if (key.endsWith("/full")) {
        const mp4Inicio = new Uint8Array([
          0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
          0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0,
        ]);
        return { bytes: 10_000_000, inicio: mp4Inicio };
      }
      return { bytes: 30_000, inicio: JPEG_INICIO };
    });

    parseJsonBody.mockResolvedValue({
      data: { uploadId: UPLOAD_ID, chave: CHAVE, mime: "video/mp4" },
    });

    withEvent.mockImplementation(async (_pool: unknown, _eventId: unknown, fn: (c: unknown) => Promise<unknown>) =>
      fn({ query: vi.fn().mockResolvedValue({ rows: [] }) }),
    );
    confirmUpload.mockResolvedValue({ ok: true, uploadId: UPLOAD_ID, estado: "criado" });

    const res = await POST(req({ uploadId: UPLOAD_ID, chave: CHAVE, mime: "video/mp4" }));

    expect(res.status).toBe(200);
  });

  it("thumb de vídeo com conteúdo HTML → 422", async () => {
    inspecionarObjeto.mockImplementation(async (key: string) => {
      if (key.endsWith("/full")) {
        const mp4Inicio = new Uint8Array([
          0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
          0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0,
        ]);
        return { bytes: 10_000_000, inicio: mp4Inicio };
      }
      return { bytes: 5_000, inicio: HTML_INICIO };
    });

    parseJsonBody.mockResolvedValue({
      data: { uploadId: UPLOAD_ID, chave: CHAVE, mime: "video/mp4" },
    });
    confirmUpload.mockResolvedValue({
      ok: false,
      code: "midia.conteudo_nao_confere",
      message: "Arquivo recusado",
    });

    const res = await POST(req({ uploadId: UPLOAD_ID, chave: CHAVE, mime: "video/mp4" }));

    expect(res.status).toBe(422);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("midia.conteudo_nao_confere");
  });
});
