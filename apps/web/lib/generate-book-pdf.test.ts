import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  CAPITULO_UNICO,
  montarAlbum,
  planejarCapitulos,
  TETO_DE_PAGINAS_PADRAO,
  type MidiaDoAlbum,
} from "@albora/core";
import { generateBookPdf } from "./generate-book-pdf";

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
    expect(Math.round(size.width)).toBe(Math.round((210 * 72) / 25.4));
    expect(Math.round(size.height)).toBe(Math.round((297 * 72) / 25.4));
  });

  it("álbum vazio ainda devolve uma página de aviso", async () => {
    const album = montarAlbum([], plano());
    const result = await generateBookPdf({
      album,
      tituloDoCapitulo: () => "—",
    });
    expect(result.paginas).toBe(1);
    const doc = await PDFDocument.load(result.pdf);
    expect(doc.getPageCount()).toBe(1);
  });
});
