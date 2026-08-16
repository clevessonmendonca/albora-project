import { describe, expect, it } from "vitest";
import { MAX_BYTES } from "@albora/core";
import { persistCapture } from "./capture";
import { memoryFiles } from "./files";
import { createFileQueue, memoryStore } from "./queue";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(32).fill(0)]);
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
  it("enfileira JPEG com corpo em arquivo, e list() devolve o mesmo caminho", async () => {
    const { files, queue, origem } = setup(JPEG);
    const result = await persistCapture({
      source: { uri: origem, width: 1080, height: 1920 },
      eventoId: "ev-1",
      queue,
      files,
      destDir: "fila/arquivos",
      id: () => "foto-1",
      now: () => 1_700_000_000_000,
    });

    expect(result).toEqual({
      ok: true,
      id: "foto-1",
      caminho: "fila/arquivos/foto-1.jpg",
    });

    const item = (await queue.list())[0];
    expect(item?.corpo).toEqual({
      tipo: "arquivo",
      caminho: "fila/arquivos/foto-1.jpg",
      bytes: JPEG.byteLength,
    });
    expect(item?.mime).toBe("image/jpeg");
    expect(item?.eventoId).toBe("ev-1");
    expect(item?.largura).toBe(1080);
    expect(item?.altura).toBe(1920);
    expect(files.files.has("fila/arquivos/foto-1.jpg")).toBe(true);
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

  it("recusa HEIC — o acervo não aceita o que o telão não exibe", async () => {
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

  it("recusa acima do teto sem enfileirar", async () => {
    const enorme = new Uint8Array(MAX_BYTES + 1);
    enorme[0] = 0xff;
    enorme[1] = 0xd8;
    enorme[2] = 0xff;
    const { files, queue, origem } = setup(enorme);
    const result = await persistCapture({
      source: { uri: origem },
      eventoId: "ev-1",
      queue,
      files,
      destDir: "fila/arquivos",
      id: () => "grande",
    });

    expect(result).toEqual({ ok: false, erro: "Essa foto é grande demais." });
    expect(await queue.list()).toEqual([]);
  });

  it("sem eventoId não copia — a fila é por evento", async () => {
    const { files, queue, origem } = setup(JPEG);
    const result = await persistCapture({
      source: { uri: origem },
      eventoId: "",
      queue,
      files,
      destDir: "fila/arquivos",
      id: () => "sem-evento",
    });

    expect(result.ok).toBe(false);
    expect(files.files.has("fila/arquivos/sem-evento.jpg")).toBe(false);
    expect(await queue.list()).toEqual([]);
  });
});
