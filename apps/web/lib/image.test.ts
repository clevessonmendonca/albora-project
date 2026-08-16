import { beforeEach, describe, expect, it, vi } from "vitest";
import { deviceDecodes, forgetSupportedFormats, prepareVideo, videoDisplaySize } from "./image";

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

describe("videoDisplaySize", () => {
  it("lê o par já em pé do decoder", () => {
    expect(videoDisplaySize({ videoWidth: 1920, videoHeight: 1080 })).toEqual({
      largura: 1920,
      altura: 1080,
    });
  });

  it("retrato de festa continua retrato", () => {
    expect(videoDisplaySize({ videoWidth: 1080, videoHeight: 1920 })).toEqual({
      largura: 1080,
      altura: 1920,
    });
  });

  it("lado zero ou inválido não vira 1080×1920", () => {
    expect(videoDisplaySize({ videoWidth: 0, videoHeight: 1080 })).toBeNull();
    expect(videoDisplaySize({ videoWidth: 1920, videoHeight: Number.NaN })).toBeNull();
    expect(videoDisplaySize({ videoWidth: -1, videoHeight: 1080 })).toBeNull();
  });

  it("arredonda para inteiro — o confirm recusa decimal", () => {
    expect(videoDisplaySize({ videoWidth: 1920.4, videoHeight: 1080.6 })).toEqual({
      largura: 1920,
      altura: 1081,
    });
  });
});

describe("prepareVideo", () => {
  it("sem document, devolve null — o vídeo ainda sobe sem dimensão", async () => {
    expect(await prepareVideo(new Blob(["x"], { type: "video/mp4" }))).toBeNull();
  });

  it("devolve largura e altura mesmo quando o poster falha", async () => {
    const video: {
      muted: boolean;
      playsInline: boolean;
      preload: string;
      videoWidth: number;
      videoHeight: number;
      duration: number;
      currentTime: number;
      onloadeddata: (() => void) | null;
      onerror: (() => void) | null;
      onseeked: (() => void) | null;
    } = {
      muted: false,
      playsInline: false,
      preload: "",
      videoWidth: 1920,
      videoHeight: 1080,
      duration: 4,
      currentTime: 0,
      onloadeddata: null,
      onerror: null,
      onseeked: null,
    };

    vi.stubGlobal("document", {
      createElement(tag: string) {
        if (tag === "video") {
          return new Proxy(video, {
            set(alvo, prop, valor) {
              Reflect.set(alvo, prop, valor);
              if (prop === "src") queueMicrotask(() => alvo.onloadeddata?.());
              if (prop === "currentTime") queueMicrotask(() => alvo.onseeked?.());
              return true;
            },
          });
        }
        if (tag === "canvas") {
          return { width: 0, height: 0, getContext: () => null };
        }
        throw new Error(tag);
      },
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:teste");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    try {
      const prep = await prepareVideo(new Blob(["x"], { type: "video/mp4" }));
      expect(prep).toEqual({ largura: 1920, altura: 1080, poster: null });
    } finally {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });
});
