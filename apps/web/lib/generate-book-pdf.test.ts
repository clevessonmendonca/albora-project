import { describe, expect, it } from "vitest";
import { encode as jpegEncode } from "jpeg-js";
import { PDFDocument } from "pdf-lib";
import {
  CAPITULO_UNICO,
  montarAlbum,
  planejarCapitulos,
  TETO_DE_PAGINAS_PADRAO,
  type MidiaDoAlbum,
} from "@albora/core";
import { ALBORA_BRAND } from "@albora/tokens";
import { BOOK_CUT_MM } from "./book-layout";
import { generateBookPdf } from "./generate-book-pdf";

/** JPEG 8×8 cinza — suficiente para pdf-lib embedJpg. */
function jpegMinimo(w = 8, h = 8): Uint8Array {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 180;
    data[i + 1] = 180;
    data[i + 2] = 180;
    data[i + 3] = 255;
  }
  return new Uint8Array(jpegEncode({ data, width: w, height: h }, 90).data);
}

const janela = {
  comecaEm: new Date("2026-08-09T21:00:00.000Z"),
  terminaEm: new Date("2026-08-10T05:00:00.000Z"),
  offsetMinutos: -180,
};

function plano() {
  return {
    janela,
    capitulos: planejarCapitulos(janela, [CAPITULO_UNICO]),
    tetoDePaginas: TETO_DE_PAGINAS_PADRAO,
  };
}

function midia(id: string): MidiaDoAlbum {
  return {
    id,
    sessaoId: "s1",
    capturadaEm: new Date("2026-08-09T23:00:00.000Z"),
    recebidaEm: new Date("2026-08-09T23:01:00.000Z"),
    largura: 1080,
    altura: 1920,
    lugarId: null,
    missaoId: null,
    reacoes: 0,
  };
}

describe("generateBookPdf", () => {
  it("gera PDF A4 com pelo menos uma página", async () => {
    const album = montarAlbum([midia("a"), midia("b")], plano());
    const result = await generateBookPdf({
      album,
      tituloDoCapitulo: () => "A festa",
    });
    expect(result.paginas).toBeGreaterThanOrEqual(1);
    expect(result.semFotos).toBeGreaterThan(0);

    const doc = await PDFDocument.load(result.pdf);
    expect(doc.getPageCount()).toBe(result.paginas);
    const size = doc.getPage(0).getSize();
    // Página física = A4 + sangria 3 mm de cada lado → BOOK_CUT_MM (216 × 303 mm).
    expect(Math.round(size.width)).toBe(Math.round((BOOK_CUT_MM.width * 72) / 25.4));
    expect(Math.round(size.height)).toBe(Math.round((BOOK_CUT_MM.height * 72) / 25.4));
  });

  it("álbum vazio ainda devolve uma página de aviso com sangria", async () => {
    const album = montarAlbum([], plano());
    const result = await generateBookPdf({
      album,
      tituloDoCapitulo: () => "—",
    });
    expect(result.paginas).toBe(1);
    const doc = await PDFDocument.load(result.pdf);
    expect(doc.getPageCount()).toBe(1);
    const size = doc.getPage(0).getSize();
    expect(Math.round(size.width)).toBe(Math.round((BOOK_CUT_MM.width * 72) / 25.4));
    expect(Math.round(size.height)).toBe(Math.round((BOOK_CUT_MM.height * 72) / 25.4));
  });

  it("embute JPEG quando imagens são passadas — comFotos >= 1", async () => {
    const imgBytes = jpegMinimo();
    const m1 = midia("img-a");
    const m2 = midia("img-b");
    const album = montarAlbum([m1, m2], plano());

    const imagens = new Map<string, Uint8Array>([["img-a", imgBytes]]);
    const result = await generateBookPdf({
      album,
      tituloDoCapitulo: () => "A festa",
      imagens,
    });

    expect(result.comFotos).toBeGreaterThanOrEqual(1);
    expect(result.semFotos).toBeGreaterThanOrEqual(0);
    expect(result.comFotos + result.semFotos).toBeGreaterThanOrEqual(1);

    const doc = await PDFDocument.load(result.pdf);
    expect(doc.getPageCount()).toBe(result.paginas);
  });

  it("aceita vendorTokens e gera PDF válido — acento do vendor (ALBORA_BRAND.cores.critico)", async () => {
    const album = montarAlbum([midia("v1"), midia("v2")], plano());
    const result = await generateBookPdf({
      album,
      tituloDoCapitulo: () => "A festa",
      vendorTokens: { cores: { acento: ALBORA_BRAND.cores.critico } },
    });

    expect(result.paginas).toBeGreaterThanOrEqual(1);
    const doc = await PDFDocument.load(result.pdf);
    expect(doc.getPageCount()).toBe(result.paginas);
  });
});
