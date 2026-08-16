import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { webTransport, ApiError } from "./transport";

const itemBlob = {
  id: "11111111-1111-1111-1111-111111111111",
  eventoId: "22222222-2222-2222-2222-222222222222",
  corpo: { tipo: "blob" as const, blob: new Blob(["x"], { type: "image/jpeg" }) },
  mime: "image/jpeg",
  criadoEm: 1,
  tentativas: 0,
};

describe("webTransport", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("presign envia metadados do item", async () => {
    const presign = {
      uploadId: itemBlob.id,
      chave: "events/e/full",
      full: "https://storage.test/full",
      thumb: "https://storage.test/thumb",
      expiraEm: Date.now() + 60_000,
    };

    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(presign), { status: 200 }));

    const resposta = await webTransport.presign(itemBlob);

    expect(resposta.chave).toBe(presign.chave);
    expect(fetch).toHaveBeenCalledWith(
      "/api/uploads/presign",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
      }),
    );
  });

  it("recusa corpo de arquivo na web", async () => {
    await expect(
      webTransport.presign({
        ...itemBlob,
        corpo: { tipo: "arquivo", caminho: "/tmp/foto.jpg", bytes: 1 },
      }),
    ).rejects.toThrow("não é enviável pela web");
  });

  it("confirmar envia instante e dimensões quando o item os tem", async () => {
    await webTransport.confirm(
      {
        ...itemBlob,
        capturadaEm: Date.parse("2026-08-09T01:10:00.000Z"),
        largura: 1080,
        altura: 1920,
      },
      {
        uploadId: itemBlob.id,
        chave: "events/e/full",
        full: "u",
        thumb: "t",
        expiraEm: 1,
      },
    );

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const corpo = JSON.parse(String(init.body)) as {
      capturadaEm?: string;
      largura?: number;
      altura?: number;
    };

    expect(corpo.capturadaEm).toBe("2026-08-09T01:10:00.000Z");
    expect(corpo.largura).toBe(1080);
    expect(corpo.altura).toBe(1920);
  });

  it("confirmar marca parede de EXIF para o servidor aplicar o fuso do evento", async () => {
    await webTransport.confirm(
      {
        ...itemBlob,
        capturadaEm: Date.parse("2026-08-08T21:00:00.000Z"),
        capturadaEmParede: true,
      },
      {
        uploadId: itemBlob.id,
        chave: "events/e/full",
        full: "u",
        thumb: "t",
        expiraEm: 1,
      },
    );

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const corpo = JSON.parse(String(init.body)) as {
      capturadaEm?: string;
      capturadaEmParede?: boolean;
    };

    expect(corpo.capturadaEm).toBe("2026-08-08T21:00:00.000Z");
    expect(corpo.capturadaEmParede).toBe(true);
  });

  it("confirmar envia o tamanho real do vídeo, não o retrato assumido", async () => {
    await webTransport.confirm(
      {
        ...itemBlob,
        mime: "video/mp4",
        largura: 1920,
        altura: 1080,
      },
      {
        uploadId: itemBlob.id,
        chave: "events/e/full",
        full: "u",
        thumb: "t",
        expiraEm: 1,
      },
    );

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const corpo = JSON.parse(String(init.body)) as { largura?: number; altura?: number };

    expect(corpo.largura).toBe(1920);
    expect(corpo.altura).toBe(1080);
  });

  it("confirmar propaga codigo de erro da API", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ code: "upload.invalido" }), { status: 422 }),
    );

    await expect(
      webTransport.confirm(itemBlob, {
        uploadId: itemBlob.id,
        chave: "events/e/full",
        full: "u",
        thumb: "t",
        expiraEm: 1,
      }),
    ).rejects.toMatchObject({ etapa: "confirm", status: 422, codigo: "upload.invalido" });
  });
});

describe("ApiError", () => {
  it("marca 401, 403 e 422 como definitivos", () => {
    expect(new ApiError("presign", 401).definitivo).toBe(true);
    expect(new ApiError("put", 403).definitivo).toBe(true);
    expect(new ApiError("confirm", 422).definitivo).toBe(true);
  });

  it("deixa 503 retentável", () => {
    expect(new ApiError("put", 503).definitivo).toBe(false);
  });
});
