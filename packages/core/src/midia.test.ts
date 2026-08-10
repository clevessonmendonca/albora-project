import { describe, expect, it } from "vitest";
import { detectarTipo, MAX_BYTES, validarConteudo, validarDeclaracao } from "./midia";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(32).fill(0)]);

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
