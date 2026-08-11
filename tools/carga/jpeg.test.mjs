import { describe, expect, it } from "vitest";
import { gerarJpeg } from "./jpeg.mjs";
import { sorteador } from "./rajada.mjs";

/**
 * Vertical e pequena: três de cada quatro fotos de festa são verticais, e o
 * tamanho aqui é o que mantém a suíte rápida. O formato é o mesmo.
 */
function foto(opcoes = {}) {
  return gerarJpeg({ largura: 96, altura: 128, sortear: sorteador("teste"), ...opcoes });
}

describe("gerarJpeg", () => {
  it("abre com os magic bytes que o confirm exige", () => {
    // `validarConteudo` em packages/core/src/midia.ts recusa qualquer outra
    // coisa com 422 — e aí o teste de carga mediria a rejeição, não o caminho.
    const { bytes } = foto();
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xff, 0xd8, 0xff]);
  });

  it("fecha com EOI", () => {
    const { bytes } = foto();
    expect([bytes[bytes.length - 2], bytes[bytes.length - 1]]).toEqual([0xff, 0xd9]);
  });

  it("declara no SOF0 as dimensões pedidas", () => {
    const { bytes } = foto({ largura: 320, altura: 240 });
    const sof = indiceDoMarcador(bytes, 0xc0);
    expect(sof).toBeGreaterThan(0);
    expect((bytes[sof + 5] << 8) | bytes[sof + 6]).toBe(240);
    expect((bytes[sof + 7] << 8) | bytes[sof + 8]).toBe(320);
  });

  it("traz as quatro tabelas de Huffman e as duas de quantização", () => {
    const { bytes } = foto();
    expect(contarMarcadores(bytes, 0xc4)).toBe(4);
    expect(contarMarcadores(bytes, 0xdb)).toBe(2);
  });

  it("faz byte stuffing — todo 0xFF do fluxo é seguido de 0x00", () => {
    // Sem isto o decodificador lê um 0xFF de dado como início de marcador e
    // abandona a imagem no meio. O sintoma é foto que sobe e não abre.
    const { bytes } = foto({ grao: 200 });
    const sos = indiceDoMarcador(bytes, 0xda);
    const inicio = sos + 2 + ((bytes[sos + 2] << 8) | bytes[sos + 3]);

    for (let i = inicio; i < bytes.length - 2; i += 1) {
      if (bytes[i] === 0xff) expect(bytes[i + 1]).toBe(0x00);
    }
  });

  it("é determinístico por semente", () => {
    const a = gerarJpeg({ largura: 64, altura: 64, sortear: sorteador("a") });
    const b = gerarJpeg({ largura: 64, altura: 64, sortear: sorteador("a") });
    const c = gerarJpeg({ largura: 64, altura: 64, sortear: sorteador("c") });
    expect(Buffer.from(a.bytes).equals(Buffer.from(b.bytes))).toBe(true);
    expect(Buffer.from(a.bytes).equals(Buffer.from(c.bytes))).toBe(false);
  });

  it("tem grão — um gradiente puro pesaria pouco e mediria uma rede irreal", () => {
    const comGrao = foto({ grao: 60 }).bytes.length;
    const liso = foto({ grao: 0 }).bytes.length;
    expect(comGrao).toBeGreaterThan(liso * 2);
  });

  it("aceita dimensão que não fecha em 8", () => {
    const { bytes } = foto({ largura: 99, altura: 131 });
    const sof = indiceDoMarcador(bytes, 0xc0);
    expect((bytes[sof + 5] << 8) | bytes[sof + 6]).toBe(131);
    expect((bytes[sof + 7] << 8) | bytes[sof + 8]).toBe(99);
  });

  it("recusa dimensão inválida", () => {
    expect(() => foto({ largura: 0 })).toThrow(RangeError);
    expect(() => foto({ altura: 10.5 })).toThrow(RangeError);
  });
});

/** @param {Uint8Array} bytes @param {number} marcador */
function indiceDoMarcador(bytes, marcador) {
  let i = 2;
  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) return -1;
    if (bytes[i + 1] === marcador) return i;
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return -1;
}

/** Só percorre a área de segmentos, que termina no SOS. */
function contarMarcadores(bytes, marcador) {
  let i = 2;
  let quantos = 0;
  while (i < bytes.length - 1 && bytes[i] === 0xff) {
    if (bytes[i + 1] === marcador) quantos += 1;
    if (bytes[i + 1] === 0xda) break;
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return quantos;
}
