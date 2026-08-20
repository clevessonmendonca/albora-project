import { describe, expect, it } from "vitest";
import {
  CAPITULO_UNICO,
  montarAlbum,
  planejarCapitulos,
  TETO_DE_PAGINAS_PADRAO,
  type MidiaDoAlbum,
} from "@albora/core";
import { BLEED_MM } from "@albora/tokens";
import { planBook, planBookPage, BOOK_BLEED_MM, BOOK_CUT_MM, BOOK_PAGE_MM } from "./book-layout";

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

function midia(over: Partial<MidiaDoAlbum> & Pick<MidiaDoAlbum, "id">): MidiaDoAlbum {
  return {
    sessaoId: "s1",
    capturadaEm: new Date("2026-08-09T23:00:00.000Z"),
    recebidaEm: new Date("2026-08-09T23:01:00.000Z"),
    largura: 1080,
    altura: 1920,
    lugarId: null,
    missaoId: null,
    reacoes: 0,
    ...over,
  };
}

describe("BOOK_BLEED_MM / BOOK_CUT_MM", () => {
  it("BOOK_BLEED_MM reutiliza BLEED_MM do @albora/tokens", () => {
    expect(BOOK_BLEED_MM).toBe(BLEED_MM);
  });

  it("BOOK_BLEED_MM vale 3 mm", () => {
    expect(BOOK_BLEED_MM).toBe(3);
  });

  it("BOOK_CUT_MM tem A4 + sangria dos quatro lados", () => {
    expect(BOOK_CUT_MM.width).toBe(BOOK_PAGE_MM.width + BOOK_BLEED_MM * 2);
    expect(BOOK_CUT_MM.height).toBe(BOOK_PAGE_MM.height + BOOK_BLEED_MM * 2);
  });

  it("BOOK_CUT_MM é 216 × 303 mm", () => {
    expect(BOOK_CUT_MM.width).toBe(216);
    expect(BOOK_CUT_MM.height).toBe(303);
  });
});

describe("planBookPage", () => {
  it("encaixa um retrato sem ultrapassar a página", () => {
    const album = montarAlbum([midia({ id: "a", largura: 1080, altura: 1920 })], plano());
    const pagina = album.capitulos[0]?.paginas[0];
    expect(pagina).toBeDefined();
    const plan = planBookPage(pagina!, { titulo: "A noite", numero: 1 });
    expect(plan.slots).toHaveLength(1);
    const s = plan.slots[0]!;
    expect(s.x + s.width).toBeLessThanOrEqual(BOOK_PAGE_MM.width);
    expect(s.y + s.height).toBeLessThanOrEqual(BOOK_PAGE_MM.height);
    expect(s.proporcao).toBe("retrato");
  });
});

describe("planBook", () => {
  it("numera páginas em ordem dos capítulos", () => {
    const album = montarAlbum(
      [
        midia({ id: "a", largura: 1080, altura: 1920 }),
        midia({
          id: "b",
          largura: 1920,
          altura: 1080,
          capturadaEm: new Date("2026-08-10T01:00:00.000Z"),
          recebidaEm: new Date("2026-08-10T01:01:00.000Z"),
        }),
      ],
      plano(),
    );
    const pages = planBook(album, (id) => id);
    expect(pages.length).toBe(album.totalDePaginas);
    expect(pages.map((p) => p.numero)).toEqual(pages.map((_, i) => i + 1));
  });
});
