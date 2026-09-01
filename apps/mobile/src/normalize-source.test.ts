import { describe, expect, it, vi } from "vitest";
import { normalizeSource } from "./normalize-source";

// expo-image-manipulator carrega React Native que usa sintaxe Flow — inacessível no vitest/node. Como todos os testes injetam `manipulate`, o default nunca roda.
vi.mock("expo-image-manipulator", () => ({
  manipulateAsync: vi.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

// Bytes de cabeçalho HEIC: ftyp box com "heic"
const HEIC_HEAD = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
  0x68, 0x65, 0x69, 0x63, 0x00, 0x00, 0x00, 0x00,
]);

// Bytes de cabeçalho JPEG: SOI marker
const JPEG_HEAD = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

const EMPTY_HEAD = new Uint8Array(0);

describe("normalizeSource", () => {
  it("devolve URI original quando JPEG e sem alwaysConvert", async () => {
    const result = await normalizeSource({
      head: JPEG_HEAD,
      uri: "file:///tmp/foto.jpg",
      width: 100,
      height: 80,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source.uri).toBe("file:///tmp/foto.jpg");
    expect(result.source.width).toBe(100);
    expect(result.source.height).toBe(80);
  });

  it("converte HEIC usando manipulate injetado", async () => {
    const jpegUri = "file:///tmp/convertida.jpg";
    const manipulate = async (_uri: string) => jpegUri;

    const result = await normalizeSource({
      head: HEIC_HEAD,
      uri: "file:///tmp/foto.heic",
      manipulate,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source.uri).toBe(jpegUri);
  });

  it("retorna erro quando manipulate falha em arquivo HEIC", async () => {
    const manipulate = async (_uri: string): Promise<string> => {
      throw new Error("falha na conversão");
    };

    const result = await normalizeSource({
      head: HEIC_HEAD,
      uri: "file:///tmp/foto.heic",
      manipulate,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.erro).toMatch(/HEIC/);
  });

  it("alwaysConvert força conversão mesmo para JPEG", async () => {
    const jpegUri = "file:///tmp/convertida.jpg";
    const manipulate = async (_uri: string) => jpegUri;

    const result = await normalizeSource({
      head: JPEG_HEAD,
      uri: "file:///tmp/foto.jpg",
      alwaysConvert: true,
      manipulate,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source.uri).toBe(jpegUri);
  });

  it("alwaysConvert com cabeçalho vazio (URIs de galeria) converte via manipulate", async () => {
    const jpegUri = "file:///tmp/saida.jpg";
    const chamadas: string[] = [];
    const manipulate = async (uri: string) => {
      chamadas.push(uri);
      return jpegUri;
    };

    const result = await normalizeSource({
      head: EMPTY_HEAD,
      uri: "ph://123abc",
      alwaysConvert: true,
      manipulate,
    });

    expect(result.ok).toBe(true);
    expect(chamadas).toEqual(["ph://123abc"]);
    if (!result.ok) return;
    expect(result.source.uri).toBe(jpegUri);
  });

  it("alwaysConvert retorna erro quando manipulate falha", async () => {
    const manipulate = async (_uri: string): Promise<string> => {
      throw new Error("sem permissão");
    };

    const result = await normalizeSource({
      head: EMPTY_HEAD,
      uri: "ph://456def",
      alwaysConvert: true,
      manipulate,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.erro).toMatch(/HEIC/);
  });

  it("sem alwaysConvert e cabeçalho vazio, devolve URI original", async () => {
    const result = await normalizeSource({
      head: EMPTY_HEAD,
      uri: "file:///tmp/foto.jpg",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source.uri).toBe("file:///tmp/foto.jpg");
  });
});
