import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiModule from "@/lib/api";

/** Cobre a porta de entrada do caminho crítico (§ REGRAS NÃO NEGOCIÁVEIS — Isolamento entre eventos):
 * a chave de storage é sempre derivada no servidor a partir de `event_id` + `uploadId`, o cliente
 * nunca a escolhe — nem aqui, nem no confirm. */

const EVENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_EVENT_ID = "ffffffff-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SESSION_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const UPLOAD_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const { assinarPut } = vi.hoisted(() => ({ assinarPut: vi.fn() }));
vi.mock("@/lib/r2", () => ({ assinarPut }));

const { requireGuestSession, enforceRateLimit, requireConfig, parseJsonBody } = vi.hoisted(() => ({
  requireGuestSession: vi.fn(),
  enforceRateLimit: vi.fn(),
  requireConfig: vi.fn((): Response | null => null),
  parseJsonBody: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, requireGuestSession, enforceRateLimit, requireConfig, parseJsonBody };
});

const { withEvent, planoDoEvento, contarVideosDaSessao } = vi.hoisted(() => ({
  withEvent: vi.fn(),
  planoDoEvento: vi.fn(),
  contarVideosDaSessao: vi.fn(),
}));

vi.mock("@albora/db", () => ({ withEvent, planoDoEvento, contarVideosDaSessao }));

vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));

const { recordFunnelEvent } = vi.hoisted(() => ({ recordFunnelEvent: vi.fn() }));
vi.mock("@/features/guest/lib/record-funnel", () => ({ recordFunnelEvent }));

const { POST } = await import("./route");

function req(body: unknown) {
  return new Request("https://exemplo.test/api/uploads/presign", {
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
    data: { uploadId: UPLOAD_ID, mime: "image/jpeg", bytes: 800_000 },
  });
  withEvent.mockImplementation(async (_pool: unknown, _eventId: unknown, fn: (c: unknown) => Promise<unknown>) =>
    fn({}),
  );
  planoDoEvento.mockResolvedValue("free");
  contarVideosDaSessao.mockResolvedValue(0);
  assinarPut.mockImplementation(async (chave: string) => `https://storage.test/${chave}?signed=1`);
});

describe("POST /api/uploads/presign", () => {
  it("config ausente → 503, não chega a assinar nada", async () => {
    requireConfig.mockReturnValue(
      Response.json({ code: "config.missing", message: "Serviço indisponível" }, { status: 503 }),
    );

    const res = await POST(req({ uploadId: UPLOAD_ID, mime: "image/jpeg", bytes: 800_000 }));

    expect(res.status).toBe(503);
    expect(assinarPut).not.toHaveBeenCalled();
  });

  it("sessão de convidado ausente ou inválida → 401, devolvido tal e qual", async () => {
    requireGuestSession.mockResolvedValue(
      Response.json({ code: "sessao.invalida", message: "Sessão inválida" }, { status: 401 }),
    );

    const res = await POST(req({ uploadId: UPLOAD_ID, mime: "image/jpeg", bytes: 800_000 }));

    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("sessao.invalida");
    expect(assinarPut).not.toHaveBeenCalled();
  });

  it("rate limit excedido → resposta de limite, sem assinar", async () => {
    enforceRateLimit.mockReturnValue(
      Response.json({ code: "limite.excedido", message: "Espere um instante" }, { status: 429 }),
    );

    const res = await POST(req({ uploadId: UPLOAD_ID, mime: "image/jpeg", bytes: 800_000 }));

    expect(res.status).toBe(429);
    expect(assinarPut).not.toHaveBeenCalled();
  });

  it("payload incompleto (bytes ausente) → 422 validation_error, nunca 500", async () => {
    parseJsonBody.mockResolvedValue({ data: { uploadId: UPLOAD_ID, mime: "image/jpeg" } });

    const res = await POST(req({ uploadId: UPLOAD_ID, mime: "image/jpeg" }));

    expect(res.status).toBe(422);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("validation_error");
    expect(assinarPut).not.toHaveBeenCalled();
  });

  it("arquivo grande demais → 422 midia.grande_demais, recusado antes de assinar", async () => {
    const bytesDemais = 13 * 1024 * 1024;
    parseJsonBody.mockResolvedValue({
      data: { uploadId: UPLOAD_ID, mime: "image/jpeg", bytes: bytesDemais },
    });

    const res = await POST(req({ uploadId: UPLOAD_ID, mime: "image/jpeg", bytes: bytesDemais }));

    expect(res.status).toBe(422);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("midia.grande_demais");
    expect(assinarPut).not.toHaveBeenCalled();
  });

  it("cota de vídeo esgotada no plano grátis → 403 video.cota_esgotada, não assina", async () => {
    parseJsonBody.mockResolvedValue({
      data: { uploadId: UPLOAD_ID, mime: "video/mp4", bytes: 5 * 1024 * 1024 },
    });
    planoDoEvento.mockResolvedValue("free");
    contarVideosDaSessao.mockResolvedValue(1); // free = 1 vídeo por convidado (VIDEOS_POR_CONVIDADO)

    const res = await POST(req({ uploadId: UPLOAD_ID, mime: "video/mp4", bytes: 5 * 1024 * 1024 }));

    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("video.cota_esgotada");
    expect(assinarPut).not.toHaveBeenCalled();
  });

  it("payload válido → 200 com URL assinada e chave derivada no servidor, ignorando qualquer chave enviada pelo cliente", async () => {
    const chaveForjadaPeloCliente = `events/${OTHER_EVENT_ID}/2000/01/quero-escolher-minha-chave`;
    parseJsonBody.mockResolvedValue({
      data: {
        uploadId: UPLOAD_ID,
        mime: "image/jpeg",
        bytes: 800_000,
        // Campo extra que um cliente malicioso poderia mandar — o handler nem lê isso do body.
        chave: chaveForjadaPeloCliente,
      },
    });

    const res = await POST(
      req({ uploadId: UPLOAD_ID, mime: "image/jpeg", bytes: 800_000, chave: chaveForjadaPeloCliente }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      uploadId: string;
      chave: string;
      full: string;
      thumb: string;
      expiraEm: number;
    };

    expect(body.uploadId).toBe(UPLOAD_ID);
    // A chave devolvida pertence ao evento da sessão autenticada, nunca ao valor forjado pelo cliente.
    expect(body.chave).toMatch(new RegExp(`^events/${EVENT_ID}/\\d{4}/\\d{2}/${UPLOAD_ID}$`));
    expect(body.chave).not.toBe(chaveForjadaPeloCliente);
    expect(body.full).toBe(`https://storage.test/${body.chave}/full?signed=1`);
    expect(body.thumb).toBe(`https://storage.test/${body.chave}/thumb?signed=1`);
    expect(assinarPut).toHaveBeenCalledWith(`${body.chave}/full`, "image/jpeg", 600);
    expect(assinarPut).toHaveBeenCalledWith(`${body.chave}/thumb`, "image/jpeg", 600);
  });

  it("vídeo válido assina a thumb sempre como image/jpeg (poster), não como o mime do vídeo", async () => {
    parseJsonBody.mockResolvedValue({
      data: { uploadId: UPLOAD_ID, mime: "video/mp4", bytes: 5 * 1024 * 1024 },
    });
    planoDoEvento.mockResolvedValue("celebration"); // sem teto de vídeo
    contarVideosDaSessao.mockResolvedValue(9);

    const res = await POST(req({ uploadId: UPLOAD_ID, mime: "video/mp4", bytes: 5 * 1024 * 1024 }));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { chave: string };
    expect(assinarPut).toHaveBeenCalledWith(`${body.chave}/full`, "video/mp4", 600);
    expect(assinarPut).toHaveBeenCalledWith(`${body.chave}/thumb`, "image/jpeg", 600);
  });

  it("erro inesperado ao assinar → 500 erro.interno, nunca vaza detalhe", async () => {
    assinarPut.mockRejectedValueOnce(new Error("storage fora do ar"));

    const res = await POST(req({ uploadId: UPLOAD_ID, mime: "image/jpeg", bytes: 800_000 }));

    expect(res.status).toBe(500);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("erro.interno");
  });
});
