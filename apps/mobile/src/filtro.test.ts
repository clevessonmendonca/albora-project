import { describe, expect, it } from "vitest";
import { encode as jpegEncode } from "jpeg-js";
import { PRESETS, temGeolocalizacao } from "@albora/core";
import { filtroFromPreset } from "./filtro";
import { persistCapture } from "./capture";
import { memoryFiles } from "./files";
import { createFileQueue, memoryStore } from "./queue";

// ── filtroFromPreset ──────────────────────────────────────────────────────────

describe("filtroFromPreset", () => {
  it("devolve undefined para id desconhecido", () => {
    expect(filtroFromPreset("nao-existe")).toBeUndefined();
  });

  it("mapeia o preset natural corretamente", () => {
    const filtro = filtroFromPreset("natural");
    expect(filtro).toBeDefined();
    expect(filtro!.porPixel).toBe(false);
    expect(filtro!.intensidade).toBe(1);
    expect(filtro!.ajustes).toEqual(
      PRESETS.find((p) => p.id === "natural")!.ajustes,
    );
  });

  it("propaga porPixel=true para o preset 35mm", () => {
    const filtro = filtroFromPreset("35mm");
    expect(filtro!.porPixel).toBe(true);
  });

  it("respeita intensidade customizada", () => {
    const filtro = filtroFromPreset("quente", 0.5);
    expect(filtro!.intensidade).toBe(0.5);
  });

  it("intensidade 0 produz filtro neutro (sem cor)", () => {
    const filtro = filtroFromPreset("dourado", 0);
    expect(filtro!.intensidade).toBe(0);
  });

  it("cobre todos os presets sem undefined", () => {
    for (const p of PRESETS) {
      expect(filtroFromPreset(p.id)).toBeDefined();
    }
  });
});

// ── persistCapture com filtro ─────────────────────────────────────────────────

function jpegCor(r: number, g: number, b: number, w = 32, h = 32): Uint8Array {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  return new Uint8Array(jpegEncode({ data, width: w, height: h }, 90).data);
}

function setup(bytes: Uint8Array, origem = "/tmp/shot.jpg") {
  const files = memoryFiles({ [origem]: bytes });
  const queue = createFileQueue(memoryStore(), "fila");
  return { files, queue, origem };
}

describe("persistCapture com filtro", () => {
  it("aceita ausência de filtro e enfileira sem quebrar", async () => {
    const jpeg = jpegCor(180, 180, 180);
    const { files, queue, origem } = setup(jpeg);
    const result = await persistCapture({
      source: { uri: origem },
      eventoId: "ev-1",
      queue,
      files,
      destDir: "fila/arquivos",
      id: () => "sem-filtro",
    });
    expect(result.ok).toBe(true);
    expect(await queue.list()).toHaveLength(1);
  });

  it("aceita filtro=quente e enfileira sem quebrar", async () => {
    const jpeg = jpegCor(200, 150, 100);
    const { files, queue, origem } = setup(jpeg);
    const filtro = filtroFromPreset("quente")!;
    const result = await persistCapture({
      source: { uri: origem },
      eventoId: "ev-1",
      queue,
      files,
      destDir: "fila/arquivos",
      id: () => "com-filtro-quente",
      filtro,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const gravado = files.files.get("fila/arquivos/com-filtro-quente.jpg")!;
    expect(temGeolocalizacao(gravado)).toBe(false);
    expect(await queue.list()).toHaveLength(1);
  });

  it("aceita filtro=35mm (porPixel) e enfileira sem quebrar", async () => {
    const jpeg = jpegCor(160, 140, 130);
    const { files, queue, origem } = setup(jpeg);
    const filtro = filtroFromPreset("35mm")!;
    expect(filtro.porPixel).toBe(true);
    const result = await persistCapture({
      source: { uri: origem },
      eventoId: "ev-1",
      queue,
      files,
      destDir: "fila/arquivos",
      id: () => "com-filtro-35mm",
      filtro,
    });
    expect(result.ok).toBe(true);
    expect(await queue.list()).toHaveLength(1);
  });

  it("filtro quente produz bytes diferentes de sem filtro", async () => {
    // Foto com cor não-cinza para que o filtro mude os valores RGB.
    const jpeg = jpegCor(200, 120, 80);
    const origem = "/tmp/shot.jpg";

    const { files: f1, queue: q1 } = setup(jpeg, origem);
    await persistCapture({
      source: { uri: origem },
      eventoId: "ev-1",
      queue: q1,
      files: f1,
      destDir: "fila/arquivos",
      id: () => "sem",
    });
    const sem = f1.files.get("fila/arquivos/sem.jpg")!;

    const { files: f2, queue: q2 } = setup(jpeg, origem);
    await persistCapture({
      source: { uri: origem },
      eventoId: "ev-1",
      queue: q2,
      files: f2,
      destDir: "fila/arquivos",
      id: () => "com",
      filtro: filtroFromPreset("quente")!,
    });
    const com = f2.files.get("fila/arquivos/com.jpg")!;

    // Os buffers de saída devem diferir (o filtro mudou os pixels).
    expect(Buffer.from(com).equals(Buffer.from(sem))).toBe(false);
  });

  it("tinhaGeolocalizacao permanece correta quando filtro está ativo", async () => {
    const jpeg = jpegCor(180, 180, 180);
    const { files, queue, origem } = setup(jpeg);
    const result = await persistCapture({
      source: { uri: origem },
      eventoId: "ev-1",
      queue,
      files,
      destDir: "fila/arquivos",
      id: () => "geo-filtro",
      filtro: filtroFromPreset("suave")!,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tinhaGeolocalizacao).toBe(false);
  });
});
