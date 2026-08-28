import { describe, expect, it } from "vitest";
import { PREFIXO_MAGIC_BYTES } from "@albora/core";
import { metadadosDaInspecao, rangeDoPrefixoMagic } from "./r2";

function jpegPrefixo(tamanho = PREFIXO_MAGIC_BYTES): Uint8Array {
  const corpo = new Uint8Array(tamanho);
  corpo[0] = 0xff;
  corpo[1] = 0xd8;
  corpo[2] = 0xff;
  return corpo;
}

describe("Range do prefixo — o confirm não puxa a foto", () => {
  it("pede exatamente os bytes que o magic precisa", () => {
    expect(rangeDoPrefixoMagic()).toBe(`bytes=0-${PREFIXO_MAGIC_BYTES - 1}`);
  });
});

describe("metadadosDaInspecao — resposta do GET no /full", () => {
  it("206 usa o total do Content-Range, não o tamanho do prefixo", () => {
    const meta = metadadosDaInspecao(
      206,
      new Headers({ "content-range": "bytes 0-15/819200" }),
      jpegPrefixo(),
    );

    expect(meta?.bytes).toBe(819200);
    expect(meta?.inicio.byteLength).toBe(PREFIXO_MAGIC_BYTES);
    expect([...meta!.inicio.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });

  it("404 é objeto ausente, não erro", () => {
    expect(metadadosDaInspecao(404, new Headers(), new Uint8Array())).toBeNull();
  });

  it("200 com o objeto inteiro copia só o prefixo — o buffer grande não fica preso", () => {
    const corpo = jpegPrefixo(1024 * 1024);
    const meta = metadadosDaInspecao(
      200,
      new Headers({ "content-length": String(corpo.byteLength) }),
      corpo,
    );

    expect(meta?.bytes).toBe(1024 * 1024);
    expect(meta?.inicio.byteLength).toBe(PREFIXO_MAGIC_BYTES);
    expect(meta?.inicio.buffer.byteLength).toBe(PREFIXO_MAGIC_BYTES);
  });

  it("status inesperado falha alto", () => {
    expect(() => metadadosDaInspecao(403, new Headers(), jpegPrefixo())).toThrow(/inspeção falhou: 403/);
  });
});
