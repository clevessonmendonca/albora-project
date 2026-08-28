import { describe, expect, it } from "vitest";
import { encode as jpegEncode } from "jpeg-js";
import { filtroFromPreset } from "./filtro";
import { bytesParaDataUri, previewFiltrado } from "./preview-filtro";

function jpegCor(r: number, g: number, b: number, w = 64, h = 80): Uint8Array {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  return new Uint8Array(jpegEncode({ data, width: w, height: h }, 90).data);
}

describe("previewFiltrado", () => {
  it("devolve JPEG válido sem filtro", async () => {
    const bytes = jpegCor(180, 180, 180);
    const result = await previewFiltrado(bytes, "image/jpeg", undefined);
    expect(result.byteLength).toBeGreaterThan(0);
    expect(result[0]).toBe(0xff);
    expect(result[1]).toBe(0xd8);
  });

  it("devolve JPEG válido com filtro quente", async () => {
    const bytes = jpegCor(200, 120, 80);
    const filtro = filtroFromPreset("quente")!;
    const result = await previewFiltrado(bytes, "image/jpeg", filtro);
    expect(result[0]).toBe(0xff);
    expect(result[1]).toBe(0xd8);
  });

  it("filtro muda os bytes em relação ao original", async () => {
    const bytes = jpegCor(200, 120, 80);
    const semFiltro = await previewFiltrado(bytes, "image/jpeg", undefined);
    const comFiltro = await previewFiltrado(bytes, "image/jpeg", filtroFromPreset("dourado")!);
    expect(Buffer.from(semFiltro).equals(Buffer.from(comFiltro))).toBe(false);
  });

  it("preview de imagem grande faz downscale para ≤320 px", async () => {
    const bigBytes = jpegCor(180, 160, 140, 640, 800);
    const result = await previewFiltrado(bigBytes, "image/jpeg", undefined);
    expect(result.byteLength).toBeLessThan(bigBytes.byteLength);
  });

  it("35mm (porPixel) não lança exceção", async () => {
    const bytes = jpegCor(160, 140, 130);
    await expect(
      previewFiltrado(bytes, "image/jpeg", filtroFromPreset("35mm")!),
    ).resolves.toBeTruthy();
  });

  it("cobre todos os presets sem rejeitar", async () => {
    const bytes = jpegCor(200, 150, 100);
    const { PRESETS } = await import("@albora/core");
    for (const p of PRESETS) {
      const filtro = filtroFromPreset(p.id)!;
      await expect(
        previewFiltrado(bytes, "image/jpeg", filtro),
      ).resolves.toBeTruthy();
    }
  });
});

describe("bytesParaDataUri", () => {
  it("gera data URI com prefixo correto", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const uri = bytesParaDataUri(bytes);
    expect(uri.startsWith("data:image/jpeg;base64,")).toBe(true);
  });

  it("vai e volta sem perda de bytes (round-trip)", () => {
    const bytes = new Uint8Array(Array.from({ length: 256 }, (_, i) => i));
    const uri = bytesParaDataUri(bytes);
    const b64 = uri.replace("data:image/jpeg;base64,", "");
    const decoded = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    expect(decoded).toEqual(bytes);
  });
});
