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

  it("confirmar reenvia o musicTrackId do sticker de música quando o item tem", async () => {
    await webTransport.confirm(
      { ...itemBlob, story: true, musicTrackId: "33333333-3333-3333-3333-333333333333" },
      { uploadId: itemBlob.id, chave: "events/e/full", full: "u", thumb: "t", expiraEm: 1 },
    );

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const corpo = JSON.parse(String(init.body)) as { story?: boolean; musicTrackId?: string };

    expect(corpo.story).toBe(true);
    expect(corpo.musicTrackId).toBe("33333333-3333-3333-3333-333333333333");
  });

  it("sem sticker de música, o campo não aparece no corpo", async () => {
    await webTransport.confirm(itemBlob, {
      uploadId: itemBlob.id,
      chave: "events/e/full",
      full: "u",
      thumb: "t",
      expiraEm: 1,
    });

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const corpo = JSON.parse(String(init.body)) as Record<string, unknown>;

    expect("musicTrackId" in corpo).toBe(false);
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

  it("presign sem corpo JSON de erro ainda estoura ApiError, sem código", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("não é json", { status: 500 }));

    await expect(webTransport.presign(itemBlob)).rejects.toMatchObject({
      etapa: "presign",
      status: 500,
      codigo: undefined,
    });
  });

  it("erro de rede propaga sem embrulhar em ApiError — quem decide o retry é a fila", async () => {
    const falhaDeRede = new TypeError("Failed to fetch");
    vi.mocked(fetch).mockRejectedValueOnce(falhaDeRede);

    await expect(webTransport.presign(itemBlob)).rejects.toBe(falhaDeRede);
  });

  it("sendBytes envia PUT com o content-type do item e o corpo é o Blob", async () => {
    await webTransport.sendBytes("https://storage.test/full", itemBlob);

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://storage.test/full");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(itemBlob.corpo.blob);
    expect((init.headers as Record<string, string>)["content-type"]).toBe("image/jpeg");
  });

  it("sendBytes recusa corpo de arquivo (não é Blob na web) sem chegar a chamar fetch", async () => {
    await expect(
      webTransport.sendBytes("https://storage.test/full", {
        ...itemBlob,
        corpo: { tipo: "arquivo", caminho: "/tmp/foto.jpg", bytes: 1 },
      }),
    ).rejects.toThrow("não é enviável pela web");

    expect(fetch).not.toHaveBeenCalled();
  });

  it("sendBytes: storage recusando o PUT vira ApiError sem tentar ler corpo de erro", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 403 }));

    await expect(webTransport.sendBytes("https://storage.test/full", itemBlob)).rejects.toMatchObject({
      etapa: "put",
      status: 403,
    });
  });

  it("sendPoster envia PUT do poster com content-type de imagem", async () => {
    const poster = new Blob(["p"], { type: "image/jpeg" });
    await webTransport.sendPoster!("https://storage.test/poster", poster);

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://storage.test/poster");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(poster);
    expect((init.headers as Record<string, string>)["content-type"]).toBe("image/jpeg");
  });

  it("sendPoster: storage recusando o PUT vira ApiError", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(
      webTransport.sendPoster!("https://storage.test/poster", new Blob(["p"])),
    ).rejects.toMatchObject({ etapa: "put", status: 500 });
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
