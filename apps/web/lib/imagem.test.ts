import { beforeEach, describe, expect, it, vi } from "vitest";
import { aparelhoDecodifica, esquecerSuporte } from "./imagem";

const HEIC = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
]);

const ambiente = globalThis as { createImageBitmap?: unknown };

function instalarDecoder(impl: (...args: unknown[]) => Promise<unknown>) {
  ambiente.createImageBitmap = impl;
  return impl;
}

beforeEach(() => {
  esquecerSuporte();
  delete ambiente.createImageBitmap;
});

describe("o aparelho responde, não o user-agent", () => {
  it("decodificou: o formato serve", async () => {
    instalarDecoder(vi.fn(async () => ({ close: () => {} })));

    expect(await aparelhoDecodifica(HEIC, "image/heic")).toBe(true);
  });

  it("o decoder recusou: o formato não serve", async () => {
    instalarDecoder(
      vi.fn(async () => {
        throw new DOMException("unsupported image format");
      }),
    );

    expect(await aparelhoDecodifica(HEIC, "image/heic")).toBe(false);
  });

  it("sem `createImageBitmap` no ambiente, não serve", async () => {
    expect(await aparelhoDecodifica(HEIC, "image/heic")).toBe(false);
  });

  it("pede um recorte de 1×1, não a foto inteira", async () => {
    const criar = instalarDecoder(vi.fn(async () => ({ close: () => {} })));
    await aparelhoDecodifica(HEIC, "image/heic");

    expect(criar).toHaveBeenCalledWith(expect.any(Blob), 0, 0, 1, 1);
  });

  it("fecha o bitmap de sonda", async () => {
    const fechar = vi.fn();
    instalarDecoder(vi.fn(async () => ({ close: fechar })));
    await aparelhoDecodifica(HEIC, "image/heic");

    expect(fechar).toHaveBeenCalledOnce();
  });
});

describe("a resposta é do aparelho, então vale para a festa inteira", () => {
  it("sonda uma vez por formato, não uma por foto", async () => {
    const criar = instalarDecoder(vi.fn(async () => ({ close: () => {} })));

    await aparelhoDecodifica(HEIC, "image/heic");
    await aparelhoDecodifica(HEIC, "image/heic");
    await aparelhoDecodifica(HEIC, "image/heic");

    expect(criar).toHaveBeenCalledOnce();
  });

  it("a recusa NÃO fica guardada — pode ter sido o arquivo, não o aparelho", async () => {
    // Uma foto truncada pela galeria cacheada como "este aparelho não abre
    // HEIC" recusaria todas as seguintes daquele convidado. Uma foto perdida
    // por noite viraria trinta.
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

    expect(await aparelhoDecodifica(HEIC, "image/heic")).toBe(false);
    expect(await aparelhoDecodifica(HEIC, "image/heic")).toBe(true);
  });

  it("formatos diferentes têm respostas diferentes", async () => {
    instalarDecoder(
      vi.fn(async (blob: unknown) => {
        if ((blob as Blob).type === "image/heic") throw new Error("nope");
        return { close: () => {} };
      }) as (...args: unknown[]) => Promise<unknown>,
    );

    expect(await aparelhoDecodifica(HEIC, "image/heic")).toBe(false);
    expect(await aparelhoDecodifica(HEIC, "image/jpeg")).toBe(true);
  });
});
