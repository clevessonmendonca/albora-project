import { describe, expect, it } from "vitest";
import {
  detectarTipo,
  ehHeic,
  ehVideo,
  MAX_BYTES,
  TIPOS_ACEITOS,
  TIPOS_ENTRADA,
  tipoAceito,
  validarConteudo,
  validarDeclaracao,
} from "./midia";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(32).fill(0)]);

/** Caixa `ftyp` do ISO-BMFF: tamanho, "ftyp", marca. */
const isoBmff = (marca: string) =>
  bytes(
    0x00,
    0x00,
    0x00,
    0x18,
    0x66,
    0x74,
    0x79,
    0x70,
    ...[...marca].map((c) => c.charCodeAt(0)),
  );

const HEIC = isoBmff("heic");
const HEIF_MIF1 = isoBmff("mif1");
const MOV = isoBmff("qt  ");
const MP4 = isoBmff("isom");

const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
/** `<!DOCTYPE html>` — o vetor real: XSS armazenado servido como "foto". */
const HTML = new Uint8Array([...Buffer.from("<!DOCTYPE html><script>")]);

describe("declaração do cliente, verificada no portão", () => {
  it("aceita os três tipos do produto", () => {
    for (const mime of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validarDeclaracao(mime, 800_000)).toBeNull();
    }
  });

  it("recusa tipo fora da lista", () => {
    expect(validarDeclaracao("image/svg+xml", 1000)?.code).toBe("midia.tipo_recusado");
    expect(validarDeclaracao("text/html", 1000)?.code).toBe("midia.tipo_recusado");
  });

  it("recusa tamanho zero e acima do teto", () => {
    expect(validarDeclaracao("image/jpeg", 0)?.code).toBe("midia.grande_demais");
    expect(validarDeclaracao("image/jpeg", MAX_BYTES + 1)?.code).toBe("midia.grande_demais");
  });
});

describe("magic bytes — o Content-Type do cliente não vale nada", () => {
  it("reconhece os três formatos", () => {
    expect(detectarTipo(JPEG)).toBe("image/jpeg");
    expect(detectarTipo(PNG)).toBe("image/png");
    expect(detectarTipo(WEBP)).toBe("image/webp");
  });

  it("recusa HTML declarado como JPEG", () => {
    const erro = validarConteudo("image/jpeg", HTML);

    expect(erro?.code).toBe("midia.conteudo_nao_confere");
    expect(erro?.details).toEqual({ declarado: "image/jpeg", detectado: null });
  });

  it("recusa PNG declarado como JPEG — tipo certo, declaração errada", () => {
    expect(validarConteudo("image/jpeg", PNG)?.code).toBe("midia.conteudo_nao_confere");
  });

  it("recusa RIFF que não é WEBP", () => {
    const riffQualquer = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20,
    ]);

    expect(detectarTipo(riffQualquer)).toBeNull();
  });

  it("aceita quando declaração e conteúdo batem", () => {
    expect(validarConteudo("image/jpeg", JPEG)).toBeNull();
    expect(validarConteudo("image/webp", WEBP)).toBeNull();
  });
});

describe("HEIC e vídeo — o mesmo contêiner, marcas diferentes", () => {
  it("reconhece as marcas de HEIC/HEIF", () => {
    expect(ehHeic(HEIC)).toBe(true);
    expect(ehHeic(HEIF_MIF1)).toBe(true);
    expect(ehHeic(isoBmff("hevc"))).toBe(true);
  });

  it("reconhece o .mov do iPhone e o mp4", () => {
    expect(ehVideo(MOV)).toBe(true);
    expect(ehVideo(MP4)).toBe(true);
    expect(ehVideo(isoBmff("mp42"))).toBe(true);
  });

  it("não confunde HEIC com vídeo nem o contrário", () => {
    expect(ehVideo(HEIC)).toBe(false);
    expect(ehHeic(MOV)).toBe(false);
  });

  it("JPEG continua sendo JPEG e não vira nem HEIC nem vídeo", () => {
    expect(detectarTipo(JPEG)).toBe("image/jpeg");
    expect(ehHeic(JPEG)).toBe(false);
    expect(ehVideo(JPEG)).toBe(false);
    expect(ehHeic(PNG)).toBe(false);
    expect(ehVideo(WEBP)).toBe(false);
  });

  it("ISO-BMFF de marca desconhecida não é nem um nem outro", () => {
    expect(ehHeic(isoBmff("zzzz"))).toBe(false);
    expect(ehVideo(isoBmff("zzzz"))).toBe(false);
  });

  it("arquivo curto demais não estoura", () => {
    const truncado = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68]);

    expect(ehHeic(truncado)).toBe(false);
    expect(ehVideo(truncado)).toBe(false);
    expect(ehHeic(new Uint8Array(0))).toBe(false);
  });
});

describe("HEIC nunca sobe — vira JPEG no cliente (N5.2)", () => {
  it("TIPOS_ACEITOS não ganhou HEIC", () => {
    expect(TIPOS_ACEITOS).toEqual(["image/jpeg", "image/png", "image/webp"]);
    expect(tipoAceito("image/heic")).toBe(false);
    expect(tipoAceito("image/heif")).toBe(false);
  });

  it("o portão recusa a declaração de HEIC", () => {
    expect(validarDeclaracao("image/heic", 800_000)?.code).toBe("midia.tipo_recusado");
  });

  it("HEIC no bucket não passa pela verificação de conteúdo", () => {
    expect(detectarTipo(HEIC)).toBeNull();
    expect(validarConteudo("image/jpeg", HEIC)?.code).toBe("midia.conteudo_nao_confere");
  });

  it("TIPOS_ENTRADA é o que o cliente decodifica, e é maior que o que sobe", () => {
    expect(TIPOS_ENTRADA).toContain("image/heic");
    expect(TIPOS_ENTRADA).toContain("image/heif");
    for (const aceito of TIPOS_ACEITOS) expect(TIPOS_ENTRADA).toContain(aceito);
  });
});
