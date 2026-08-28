import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { QueueItem, RespostaPresign } from "@albora/core";
import { createFileQueue, memoryStore } from "./queue";
import { memoryFiles } from "./files";
import {
  ApiError,
  arquivoDoItem,
  confirmPayload,
  createNativeTransport,
  drainFileQueue,
  presignPayload,
  stripGpsOrReject,
} from "./upload";

const JPEG_SEM_GPS = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(64).fill(0), 0xff, 0xd9]);

/** JPEG mínimo com EXIF+GPS para teste de bloqueio. Réplica do helper de exif.test.ts, necessário porque não é exportado. */
function jpegComGps(): Uint8Array {
  const PONTEIRO_GPS = 0x8825;
  const tiff: number[] = [];
  const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];

  tiff.push(0x49, 0x49); // little endian
  tiff.push(...u16(0x002a));
  tiff.push(...u32(8));
  tiff.push(...u16(1)); // uma entrada IFD0

  // entrada GPS pointer
  tiff.push(...u16(PONTEIRO_GPS));
  tiff.push(...u16(4)); // LONG
  tiff.push(...u32(1)); // count
  tiff.push(...u32(200)); // offset GPS IFD
  tiff.push(...u32(0)); // next IFD

  const corpo = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
  const tamanho = corpo.length + 2;

  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe1,
    (tamanho >> 8) & 0xff, tamanho & 0xff,
    ...corpo,
    0xff, 0xdb, 0x00, 0x04, 0x00, 0x00,
  ]);
}

function item(over: Partial<QueueItem> = {}): QueueItem {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    eventoId: "22222222-2222-2222-2222-222222222222",
    corpo: { tipo: "arquivo", caminho: "/tmp/a.jpg", bytes: JPEG_SEM_GPS.byteLength },
    mime: "image/jpeg",
    criadoEm: 1,
    tentativas: 0,
    ...over,
  };
}

const PRESIGN: RespostaPresign = {
  uploadId: item().id,
  chave: "events/ev/uploads/u",
  full: "https://storage.test/full",
  thumb: "https://storage.test/thumb",
  expiraEm: Date.now() + 60_000,
};

describe("payloads do transporte nativo", () => {
  it("presign leva uploadId, mime e bytes do arquivo", () => {
    expect(presignPayload(item(), 900)).toEqual({
      uploadId: item().id,
      mime: "image/jpeg",
      bytes: 900,
    });
  });

  it("confirm espelha o corpo da web (instante + dimensões)", () => {
    const corpo = confirmPayload(
      item({
        capturadaEm: Date.parse("2026-08-09T01:10:00.000Z"),
        largura: 1080,
        altura: 1920,
        legenda: "mesa",
      }),
      "events/ev/uploads/u",
    );
    expect(corpo).toMatchObject({
      uploadId: item().id,
      chave: "events/ev/uploads/u",
      mime: "image/jpeg",
      capturadaEm: "2026-08-09T01:10:00.000Z",
      largura: 1080,
      altura: 1920,
      legenda: "mesa",
    });
  });

  it("arquivoDoItem recusa blob — o app só envia referência de disco", () => {
    expect(() =>
      arquivoDoItem(
        item({
          corpo: { tipo: "blob", blob: new Blob(["x"]) },
        }),
      ),
    ).toThrow(/não é enviável no app/);
  });
});

describe("createNativeTransport", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("presign manda Cookie e URL absoluta", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(PRESIGN), { status: 200 }));

    const transport = createNativeTransport({
      origin: "http://localhost:3000",
      cookie: "albora_sessao=tok",
      readBytes: async () => JPEG_SEM_GPS,
    });

    await transport.presign(item());

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/uploads/presign",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          cookie: "albora_sessao=tok",
          "content-type": "application/json",
        }),
      }),
    );
  });

  it("PUT sobe os bytes do arquivo com o mime do item", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));

    const transport = createNativeTransport({
      origin: "http://localhost:3000",
      cookie: "albora_sessao=tok",
      readBytes: async (path) => {
        expect(path).toBe("/tmp/a.jpg");
        return JPEG_SEM_GPS;
      },
    });

    await transport.sendBytes(PRESIGN.full, item());

    expect(fetch).toHaveBeenCalledWith(
      PRESIGN.full,
      expect.objectContaining({
        method: "PUT",
        headers: { "content-type": "image/jpeg" },
      }),
    );
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeInstanceOf(Blob);
  });

  it("401 no confirm é definitivo", () => {
    const err = new ApiError("confirm", 401, "sessao.invalida");
    expect(err.definitivo).toBe(true);
  });

  it("sendBytes rejeita foto com GPS antes do PUT", async () => {
    const comGps = jpegComGps();

    const transport = createNativeTransport({
      origin: "http://localhost:3000",
      cookie: "albora_sessao=tok",
      readBytes: async () => comGps,
    });

    await expect(transport.sendBytes(PRESIGN.full, item())).rejects.toThrow(/GPS/);
  });

  it("sendBytes usa putFile quando injetado (URLSession / upload nativo)", async () => {
    const putFile = vi.fn(async () => ({ status: 200 }));

    const transport = createNativeTransport({
      origin: "http://localhost:3000",
      cookie: "albora_sessao=tok",
      readBytes: async () => JPEG_SEM_GPS,
      putFile,
    });

    await transport.sendBytes(PRESIGN.full, item());

    expect(putFile).toHaveBeenCalledWith({
      caminho: "/tmp/a.jpg",
      url: PRESIGN.full,
      mime: "image/jpeg",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("stripGpsOrReject", () => {
  it("passa foto sem GPS", () => {
    expect(() => stripGpsOrReject(JPEG_SEM_GPS)).not.toThrow();
  });

  it("rejeita foto com GPS (erro definitivo)", () => {
    const comGps = jpegComGps();
    expect(() => stripGpsOrReject(comGps)).toThrow(/GPS/);

    try {
      stripGpsOrReject(comGps);
    } catch (err) {
      expect((err as { definitivo?: boolean }).definitivo).toBe(true);
    }
  });
});

describe("drainFileQueue", () => {
  it("presign → PUT → confirm e remove o arquivo do disco", async () => {
    const files = memoryFiles({ "/tmp/a.jpg": JPEG_SEM_GPS });
    const queue = createFileQueue(memoryStore(), "fila");
    await queue.enqueue(item());

    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith("/api/uploads/presign")) {
        return new Response(JSON.stringify(PRESIGN), { status: 200 });
      }
      if (u === PRESIGN.full) return new Response(null, { status: 200 });
      if (u.endsWith("/api/uploads/confirm")) return new Response(JSON.stringify({ ok: true }), { status: 200 });
      throw new Error(`url inesperada ${u}`);
    });

    const summary = await drainFileQueue(queue, {
      session: {
        token: "abc.def",
        slug: "festa",
        sessaoId: "s1",
        eventoId: item().eventoId,
      },
      readBytes: (path) => files.readAll(path),
      removeFile: (path) => files.remove(path),
      fetch: fetchMock as unknown as typeof fetch,
      origin: "http://localhost:3000",
    });

    expect(summary.enviados).toBe(1);
    expect(await queue.list()).toEqual([]);
    expect(files.files.has("/tmp/a.jpg")).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("sem sessão não toca a fila", async () => {
    const queue = createFileQueue(memoryStore(), "fila");
    await queue.enqueue(item());
    const summary = await drainFileQueue(queue, {
      session: null,
      readBytes: async () => JPEG_SEM_GPS,
      removeFile: async () => {},
    });
    expect(summary.enviados).toBe(0);
    expect((await queue.list()).length).toBe(1);
  });
});
