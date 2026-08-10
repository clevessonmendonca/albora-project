import { describe, expect, it } from "vitest";
import {
  dimensoesCorrigidas,
  lerOrientacao,
  temExif,
  temGeolocalizacao,
  transformacaoParaOrientacao,
  type Orientacao,
} from "./exif";

type Entrada = { tag: number; tipo: 3 | 4; valor: number };

/**
 * Monta um JPEG mínimo com bloco EXIF de verdade.
 *
 * Fixture binária construída, não arquivo baixado: o teste precisa poder
 * dizer "esta foto tem orientação 6 e GPS" sem depender de um .jpg no repo
 * que ninguém sabe de onde veio nem consegue auditar.
 */
function jpegComExif(entradas: Entrada[], littleEndian = true): Uint8Array {
  const tiff: number[] = [];
  const u16 = (n: number) =>
    littleEndian ? [n & 0xff, (n >> 8) & 0xff] : [(n >> 8) & 0xff, n & 0xff];
  const u32 = (n: number) =>
    littleEndian
      ? [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]
      : [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];

  tiff.push(...(littleEndian ? [0x49, 0x49] : [0x4d, 0x4d]));
  tiff.push(...u16(0x002a));
  tiff.push(...u32(8));
  tiff.push(...u16(entradas.length));

  for (const e of entradas) {
    tiff.push(...u16(e.tag));
    tiff.push(...u16(e.tipo));
    tiff.push(...u32(1));
    // SHORT ocupa os dois primeiros bytes do campo de 4; LONG ocupa os quatro.
    tiff.push(...(e.tipo === 3 ? [...u16(e.valor), 0, 0] : u32(e.valor)));
  }
  tiff.push(...u32(0));

  const corpo = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
  const tamanho = corpo.length + 2;

  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe1,
    (tamanho >> 8) & 0xff, tamanho & 0xff,
    ...corpo,
    0xff, 0xdb, 0x00, 0x04, 0x00, 0x00,
  ]);
}

const ORIENTACAO = 0x0112;
const PONTEIRO_GPS = 0x8825;

const semExif = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x00]);

describe("orientação", () => {
  it("lê a tag em little endian e em big endian", () => {
    for (const le of [true, false]) {
      const jpeg = jpegComExif([{ tag: ORIENTACAO, tipo: 3, valor: 6 }], le);
      expect(lerOrientacao(jpeg)).toBe(6);
    }
  });

  it("sem EXIF, devolve 1 — os pixels já estão certos", () => {
    expect(lerOrientacao(semExif)).toBe(1);
    expect(temExif(semExif)).toBe(false);
  });

  it("ignora valor fora da faixa 1..8 em vez de propagar lixo", () => {
    const jpeg = jpegComExif([{ tag: ORIENTACAO, tipo: 3, valor: 99 }]);
    expect(lerOrientacao(jpeg)).toBe(1);
  });

  it("não estoura com bytes truncados", () => {
    const jpeg = jpegComExif([{ tag: ORIENTACAO, tipo: 3, valor: 6 }]);
    for (const corte of [3, 8, 14, 20]) {
      expect(() => lerOrientacao(jpeg.slice(0, corte))).not.toThrow();
    }
  });
});

describe("geolocalização", () => {
  it("detecta o ponteiro de GPS", () => {
    const comGps = jpegComExif([
      { tag: ORIENTACAO, tipo: 3, valor: 1 },
      { tag: PONTEIRO_GPS, tipo: 4, valor: 200 },
    ]);

    expect(temGeolocalizacao(comGps)).toBe(true);
  });

  it("uma foto sem o bloco não acusa GPS", () => {
    expect(temGeolocalizacao(jpegComExif([{ tag: ORIENTACAO, tipo: 3, valor: 1 }]))).toBe(false);
    expect(temGeolocalizacao(semExif)).toBe(false);
  });

  it("o ponteiro de GPS é LONG — lê os quatro bytes, não dois", () => {
    // Com leitura de 16 bits, um offset acima de 65535 viraria 0 e o GPS
    // passaria despercebido. É o caso de uma foto com EXIF grande, que é
    // justamente a foto de celular moderno.
    const comGpsLonge = jpegComExif([{ tag: PONTEIRO_GPS, tipo: 4, valor: 70_000 }]);

    expect(temGeolocalizacao(comGpsLonge)).toBe(true);
  });
});

describe("transformação a aplicar nos pixels", () => {
  it("a orientação 6 do iPhone gira 90 graus e troca os eixos", () => {
    const t = transformacaoParaOrientacao(6);

    expect(t).toEqual({ girar: 90, espelhar: false, trocaEixos: true });
    expect(dimensoesCorrigidas(4032, 3024, 6)).toEqual({ largura: 3024, altura: 4032 });
  });

  it("a orientação 1 não mexe em nada", () => {
    expect(transformacaoParaOrientacao(1)).toEqual({
      girar: 0,
      espelhar: false,
      trocaEixos: false,
    });
    expect(dimensoesCorrigidas(4032, 3024, 1)).toEqual({ largura: 4032, altura: 3024 });
  });

  it("as quatro orientações espelhadas são tratadas", () => {
    // Ignorá-las produz a foto invertida — num casamento, a aliança na mão
    // errada.
    for (const o of [2, 4, 5, 7] as Orientacao[]) {
      expect(transformacaoParaOrientacao(o).espelhar).toBe(true);
    }
  });

  it("só 5, 6, 7 e 8 trocam os eixos", () => {
    const trocam = ([1, 2, 3, 4, 5, 6, 7, 8] as Orientacao[]).filter(
      (o) => transformacaoParaOrientacao(o).trocaEixos,
    );

    expect(trocam).toEqual([5, 6, 7, 8]);
  });
});
