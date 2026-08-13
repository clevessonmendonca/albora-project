import { beforeEach, describe, expect, it, vi } from "vitest";
import { deviceDecodes, forgetSupportedFormats } from "./image";

const HEIC = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
]);

const ambiente = globalThis as { createImageBitmap?: unknown };

function instalarDecoder(impl: (...args: unknown[]) => Promise<unknown>) {
  ambiente.createImageBitmap = impl;
  return impl;
}

beforeEach(() => {
  forgetSupportedFormats();
  delete ambiente.createImageBitmap;
});

describe("o aparelho responde, não o user-agent", () => {
  it("decodificou: o formato serve", async () => {
    instalarDecoder(vi.fn(async () => ({ close: () => {} })));

    expect(await deviceDecodes(HEIC, "image/heic")).toBe(true);
  });

  it("o decoder recusou: o formato não serve", async () => {
    instalarDecoder(
      vi.fn(async () => {
        throw new DOMException("unsupported image format");
      }),
    );

    expect(await deviceDecodes(HEIC, "image/heic")).toBe(false);
  });

  it("sem `createImageBitmap` no ambiente, não serve", async () => {
    expect(await deviceDecodes(HEIC, "image/heic")).toBe(false);
  });

  it("pede um recorte de 1×1, não a foto inteira", async () => {
    const criar = instalarDecoder(vi.fn(async () => ({ close: () => {} })));
    await deviceDecodes(HEIC, "image/heic");

    expect(criar).toHaveBeenCalledWith(expect.any(Blob), 0, 0, 1, 1);
  });

  it("fecha o bitmap de sonda", async () => {
    const fechar = vi.fn();
    instalarDecoder(vi.fn(async () => ({ close: fechar })));
    await deviceDecodes(HEIC, "image/heic");

    expect(fechar).toHaveBeenCalledOnce();
  });
});

describe("a resposta é do aparelho, então vale para a festa inteira", () => {
  it("sonda uma vez por formato, não uma por foto", async () => {
    const criar = instalarDecoder(vi.fn(async () => ({ close: () => {} })));

    await deviceDecodes(HEIC, "image/heic");
    await deviceDecodes(HEIC, "image/heic");
    await deviceDecodes(HEIC, "image/heic");

    expect(criar).toHaveBeenCalledOnce();
  });

  it("a recusa NÃO fica guardada — pode ter sido o arquivo, não o aparelho", async () => {
    let primeira = true;
    instalarDecoder(
      vi.fn(async () => {
        if (primeira) {
          primeira = false;
          throw new Error("arquivo truncado");
        }
        return { close: () => {} };
      }) as (...args: unknown[]) => Promise<unknown>,
    );

    expect(await deviceDecodes(HEIC, "image/heic")).toBe(false);
    expect(await deviceDecodes(HEIC, "image/heic")).toBe(true);
  });

  it("formatos diferentes têm respostas diferentes", async () => {
    instalarDecoder(
      vi.fn(async (blob: unknown) => {
        if ((blob as Blob).type === "image/heic") throw new Error("nope");
        return { close: () => {} };
      }) as (...args: unknown[]) => Promise<unknown>,
    );

    expect(await deviceDecodes(HEIC, "image/heic")).toBe(false);
    expect(await deviceDecodes(HEIC, "image/jpeg")).toBe(true);
  });
});
