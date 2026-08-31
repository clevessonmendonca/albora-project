import { describe, expect, it } from "vitest";
import {
  detectarTipo,
  isHeic,
  isVideoBytes,
  MAX_BYTES,
  PREFIXO_MAGIC_BYTES,
  TIPOS_ACEITOS,
  TIPOS_ENTRADA,
  tipoAceito,
  validarConteudo,
  validarDeclaracao,
  validarObjetoRecebido,
  dimensoesDentroDoPlano,
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

  it("aceita vídeo mp4 dentro do teto de vídeo", () => {
    expect(validarDeclaracao("video/mp4", 40 * 1024 * 1024)).toBeNull();
    expect(validarConteudo("video/mp4", MP4)).toBeNull();
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
    expect(validarConteudo("image/png", PNG)).toBeNull();
    expect(validarConteudo("image/webp", WEBP)).toBeNull();
  });

  it("recusa JPEG declarado como mp4 e mp4 declarado como JPEG", () => {
    expect(validarConteudo("video/mp4", JPEG)?.code).toBe("midia.conteudo_nao_confere");
    expect(validarConteudo("image/jpeg", MP4)?.code).toBe("midia.conteudo_nao_confere");
  });

  it("os 16 bytes do Range do confirm bastam para os quatro formatos", () => {
    const prefixo = (src: Uint8Array) => src.slice(0, PREFIXO_MAGIC_BYTES);

    expect(validarConteudo("image/jpeg", prefixo(JPEG))).toBeNull();
    expect(validarConteudo("image/png", prefixo(PNG))).toBeNull();
    expect(validarConteudo("image/webp", prefixo(WEBP))).toBeNull();
    expect(validarConteudo("video/mp4", prefixo(MP4))).toBeNull();
  });
});

describe("o objeto que de fato chegou — tamanho do storage + magic bytes", () => {
  it("aceita JPEG cujo prefixo e tamanho batem", () => {
    expect(validarObjetoRecebido("image/jpeg", 800_000, JPEG)).toBeNull();
  });

  it("recusa HTML declarado como JPEG mesmo com tamanho de foto", () => {
    expect(validarObjetoRecebido("image/jpeg", 800_000, HTML)?.code).toBe("midia.conteudo_nao_confere");
  });

  it("recusa o tamanho real acima do teto mesmo com prefixo JPEG", () => {
    expect(validarObjetoRecebido("image/jpeg", MAX_BYTES + 1, JPEG)?.code).toBe("midia.grande_demais");
  });

  it("recusa tipo que o presign nem assinaria — o confirm não é atalho", () => {
    expect(validarObjetoRecebido("text/html", 800_000, HTML)?.code).toBe("midia.tipo_recusado");
  });
});

describe("HEIC e vídeo — o mesmo contêiner, marcas diferentes", () => {
  it("reconhece as marcas de HEIC/HEIF", () => {
    expect(isHeic(HEIC)).toBe(true);
    expect(isHeic(HEIF_MIF1)).toBe(true);
    expect(isHeic(isoBmff("hevc"))).toBe(true);
  });

  it("reconhece o .mov do iPhone e o mp4", () => {
    expect(isVideoBytes(MOV)).toBe(true);
    expect(isVideoBytes(MP4)).toBe(true);
    expect(isVideoBytes(isoBmff("mp42"))).toBe(true);
  });

  it("não confunde HEIC com vídeo nem o contrário", () => {
    expect(isVideoBytes(HEIC)).toBe(false);
    expect(isHeic(MOV)).toBe(false);
  });

  it("JPEG continua sendo JPEG e não vira nem HEIC nem vídeo", () => {
    expect(detectarTipo(JPEG)).toBe("image/jpeg");
    expect(isHeic(JPEG)).toBe(false);
    expect(isVideoBytes(JPEG)).toBe(false);
    expect(isHeic(PNG)).toBe(false);
    expect(isVideoBytes(WEBP)).toBe(false);
  });

  it("ISO-BMFF de marca desconhecida não é nem um nem outro", () => {
    expect(isHeic(isoBmff("zzzz"))).toBe(false);
    expect(isVideoBytes(isoBmff("zzzz"))).toBe(false);
  });

  it("arquivo curto demais não estoura", () => {
    const truncado = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68]);

    expect(isHeic(truncado)).toBe(false);
    expect(isVideoBytes(truncado)).toBe(false);
    expect(isHeic(new Uint8Array(0))).toBe(false);
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

describe("dimensoesDentroDoPlano — o confirm não aceita resize burlado", () => {
  it("free aceita até 2500 no lado maior", () => {
    expect(dimensoesDentroDoPlano(2500, 1875, "free")).toEqual({ ok: true });
    expect(dimensoesDentroDoPlano(2501, 1875, "free")).toEqual({
      ok: false,
      limite: 2500,
      ladoMaior: 2501,
    });
  });

  it("celebration aceita até 3500 no lado maior", () => {
    expect(dimensoesDentroDoPlano(3500, 2333, "celebration")).toEqual({ ok: true });
    expect(dimensoesDentroDoPlano(3501, 2333, "vendor")).toEqual({
      ok: false,
      limite: 3500,
      ladoMaior: 3501,
    });
  });
});
