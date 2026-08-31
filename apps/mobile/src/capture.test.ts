import { describe, expect, it } from "vitest";
import { encode as jpegEncode, decode as jpegDecode } from "jpeg-js";
import { MAX_BYTES, processarFoto, temGeolocalizacao } from "@albora/core";
import { persistCapture } from "./capture";
import { bufferDrawer } from "./drawer";
import { memoryFiles } from "./files";
import { createFileQueue, memoryStore } from "./queue";

/** JPEG 8×8 cinza — decodificável por jpeg-js. */
function jpegSolido(w = 8, h = 8): Uint8Array {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 180;
    data[i + 1] = 180;
    data[i + 2] = 180;
    data[i + 3] = 255;
  }
  return new Uint8Array(jpegEncode({ data, width: w, height: h }, 90).data);
}

/** JPEG mínimo com EXIF+GPS (mesmo padrão de upload.test). */
function jpegComGps(): Uint8Array {
  const base = jpegSolido(16, 16);
  const PONTEIRO_GPS = 0x8825;
  const tiff: number[] = [];
  const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];

  tiff.push(0x49, 0x49);
  tiff.push(...u16(0x002a));
  tiff.push(...u32(8));
  tiff.push(...u16(1));
  tiff.push(...u16(PONTEIRO_GPS));
  tiff.push(...u16(4));
  tiff.push(...u32(1));
  tiff.push(...u32(200));
  tiff.push(...u32(0));

  const corpo = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
  const tamanho = corpo.length + 2;

  // Injeta APP1 depois do SOI, antes do resto.
  const out = new Uint8Array(2 + 2 + tamanho + (base.length - 2));
  out[0] = 0xff;
  out[1] = 0xd8;
  out[2] = 0xff;
  out[3] = 0xe1;
  out[4] = (tamanho >> 8) & 0xff;
  out[5] = tamanho & 0xff;
  out.set(corpo, 6);
  out.set(base.subarray(2), 6 + corpo.length);
  return out;
}

const HTML = new Uint8Array([...Buffer.from("<!DOCTYPE html><script>")]);
const HEIC = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, ...new Array(20).fill(0),
]);

function setup(bytes: Uint8Array, origem = "/tmp/shot.jpg") {
  const files = memoryFiles({ [origem]: bytes });
  const queue = createFileQueue(memoryStore(), "fila");
  return { files, queue, origem };
}

describe("captura → arquivo → fila", () => {
  it("processa JPEG, enfileira sem EXIF e com dimensões do plano", async () => {
    const jpeg = jpegSolido(64, 48);
    const { files, queue, origem } = setup(jpeg);
    const result = await persistCapture({
      source: { uri: origem, width: 64, height: 48 },
      eventoId: "ev-1",
      queue,
      files,
      destDir: "fila/arquivos",
      id: () => "foto-1",
      now: () => 1_700_000_000_000,
      plan: "gratis",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result).toMatchObject({
      ok: true,
      id: "foto-1",
      caminho: "fila/arquivos/foto-1.jpg",
      tinhaGeolocalizacao: false,
    });

    const item = (await queue.list())[0];
    expect(item?.corpo.tipo).toBe("arquivo");
    expect(item?.mime).toBe("image/jpeg");
    expect(item?.eventoId).toBe("ev-1");
    expect(item?.largura).toBe(64);
    expect(item?.altura).toBe(48);

    const gravado = files.files.get("fila/arquivos/foto-1.jpg")!;
    expect(temGeolocalizacao(gravado)).toBe(false);
    expect(jpegDecode(gravado, { useTArray: true }).width).toBe(64);
  });

  it("reencode remove GPS e ainda enfileira", async () => {
    const comGps = jpegComGps();
    expect(temGeolocalizacao(comGps)).toBe(true);

    const { files, queue, origem } = setup(comGps);
    const result = await persistCapture({
      source: { uri: origem },
      eventoId: "ev-1",
      queue,
      files,
      destDir: "fila/arquivos",
      id: () => "gps",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tinhaGeolocalizacao).toBe(true);

    const gravado = files.files.get("fila/arquivos/gps.jpg")!;
    expect(temGeolocalizacao(gravado)).toBe(false);
    expect((await queue.list()).length).toBe(1);
  });

  it("recusa HTML declarado como foto e não deixa item na fila nem arquivo", async () => {
    const { files, queue, origem } = setup(HTML);
    const result = await persistCapture({
      source: { uri: origem },
      eventoId: "ev-1",
      queue,
      files,
      destDir: "fila/arquivos",
      id: () => "lixo",
    });

    expect(result.ok).toBe(false);
    expect(await queue.list()).toEqual([]);
    expect(files.files.has("fila/arquivos/lixo.jpg")).toBe(false);
  });

  it("recusa HEIC sem converter — o acervo não aceita o que o telão não exibe", async () => {
    const { files, queue, origem } = setup(HEIC);
    const result = await persistCapture({
      source: { uri: origem },
      eventoId: "ev-1",
      queue,
      files,
      destDir: "fila/arquivos",
      id: () => "heic",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.erro).toMatch(/HEIC/);
    expect(await queue.list()).toEqual([]);
  });

  it("aceita HEIC quando convertHeic converte para JPEG e enfileira", async () => {
    const jpeg = jpegSolido(32, 32);
    const jpegUri = "/tmp/converted.jpg";

    const { files, queue, origem } = setup(HEIC);
    // Registra o JPEG convertido no FS em memória.
    files.files.set(jpegUri, jpeg);

    const convertHeic = async (_uri: string) => jpegUri;

    const result = await persistCapture({
      source: { uri: origem },
      eventoId: "ev-1",
      queue,
      files,
      destDir: "fila/arquivos",
      id: () => "heic-conv",
      convertHeic,
    });

    expect(result.ok).toBe(true);
    expect(await queue.list()).toHaveLength(1);
  });

  it("recusa HEIC mesmo com convertHeic quando o converter falha", async () => {
    const { files, queue, origem } = setup(HEIC);

    const convertHeic = async (_uri: string): Promise<string> => {
      throw new Error("falha no conversor");
    };

    const result = await persistCapture({
      source: { uri: origem },
      eventoId: "ev-1",
      queue,
      files,
      destDir: "fila/arquivos",
      id: () => "heic-fail",
      convertHeic,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.erro).toMatch(/HEIC/);
    expect(await queue.list()).toEqual([]);
  });

  it("recusa arquivo acima do teto", async () => {
    const grande = new Uint8Array(MAX_BYTES + 1);
    grande[0] = 0xff;
    grande[1] = 0xd8;
    const { queue, files, origem } = setup(grande);
    const result = await persistCapture({
      source: { uri: origem },
      eventoId: "ev-1",
      queue,
      files,
      destDir: "fila/arquivos",
      id: () => "grande",
    });
    expect(result.ok).toBe(false);
    expect(await queue.list()).toEqual([]);
  });
});

describe("bufferDrawer", () => {
  it("processarFoto devolve JPEG sem GPS", async () => {
    const comGps = jpegComGps();
    const out = await processarFoto(comGps, "image/jpeg", bufferDrawer, {
      plan: "gratis",
      device: { memoryGb: 4, cores: 4 },
    });
    expect(out.tinhaGeolocalizacao).toBe(true);
    expect(temGeolocalizacao(out.full)).toBe(false);
    expect(out.thumb.byteLength).toBeGreaterThan(0);
  });
});
