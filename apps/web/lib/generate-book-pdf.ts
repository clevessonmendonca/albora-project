import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { Album } from "@albora/core";
import { ALBORA_BRAND, lerHex, resolveTokens, toVariables } from "@albora/tokens";
import { planBook, BOOK_MARGIN_MM, BOOK_PAGE_MM, type BookPagePlan } from "./book-layout";
import { loadPrintFonts } from "./piece-fonts";

const MM_TO_PT = 72 / 25.4;

function mm(n: number): number {
  return n * MM_TO_PT;
}

function cor(hex: string): RGB {
  const parsed = lerHex(hex);
  if (!parsed) return rgb(0.92, 0.9, 0.88);
  return rgb(parsed.r / 255, parsed.g / 255, parsed.b / 255);
}

function coresPadrao() {
  const v = toVariables(resolveTokens({ marca: ALBORA_BRAND, pack: { background: "light" } }));
  return {
    fundo: String(v["--bg"]),
    tinta: String(v["--ink"]),
    acento: String(v["--acento"]),
    placeholder: String(v["--superficie"]),
  };
}

export type BookPdfInput = {
  album: Album;
  tituloDoCapitulo: (id: string) => string;
  fundo?: string;
  tinta?: string;
  acento?: string;
  imagens?: ReadonlyMap<string, Uint8Array>;
};

export type BookPdfResult = {
  pdf: Uint8Array;
  paginas: number;
  comFotos: number;
  semFotos: number;
};

/**
 * PDF sRGB do livro curado — uma página A4 por `Pagina` do núcleo.
 */
export async function generateBookPdf(input: BookPdfInput): Promise<BookPdfResult> {
  const plans = planBook(input.album, input.tituloDoCapitulo);
  const faces = loadPrintFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit as never);
  const serif = await doc.embedFont(faces.serif);
  const sans = await doc.embedFont(faces.sans);

  const padrao = coresPadrao();
  const fundo = cor(input.fundo ?? padrao.fundo);
  const tinta = cor(input.tinta ?? padrao.tinta);
  const acento = cor(input.acento ?? padrao.acento);
  const placeholder = cor(padrao.placeholder);

  let comFotos = 0;
  let semFotos = 0;

  for (const page of plans) {
    const pdfPage = doc.addPage([mm(BOOK_PAGE_MM.width), mm(BOOK_PAGE_MM.height)]);
    const pageH = pdfPage.getHeight();

    pdfPage.drawRectangle({
      x: 0,
      y: 0,
      width: pdfPage.getWidth(),
      height: pageH,
      color: fundo,
    });

    drawHeader(pdfPage, pageH, page, serif, sans, tinta, acento);

    for (const slot of page.slots) {
      const bytes = input.imagens?.get(slot.midiaId);
      if (bytes) {
        try {
          const img = await doc.embedJpg(bytes);
          pdfPage.drawImage(img, {
            x: mm(slot.x),
            y: pageH - mm(slot.y) - mm(slot.height),
            width: mm(slot.width),
            height: mm(slot.height),
          });
          comFotos += 1;
          continue;
        } catch {
          // placeholder
        }
      }
      semFotos += 1;
      pdfPage.drawRectangle({
        x: mm(slot.x),
        y: pageH - mm(slot.y) - mm(slot.height),
        width: mm(slot.width),
        height: mm(slot.height),
        color: placeholder,
      });
    }
  }

  if (plans.length === 0) {
    const pdfPage = doc.addPage([mm(BOOK_PAGE_MM.width), mm(BOOK_PAGE_MM.height)]);
    pdfPage.drawRectangle({
      x: 0,
      y: 0,
      width: pdfPage.getWidth(),
      height: pdfPage.getHeight(),
      color: fundo,
    });
    pdfPage.drawText("Ainda não há fotos para o livro.", {
      x: mm(BOOK_MARGIN_MM),
      y: pdfPage.getHeight() - mm(40),
      size: mm(5),
      font: sans,
      color: tinta,
    });
  }

  return {
    pdf: await doc.save(),
    paginas: Math.max(plans.length, 1),
    comFotos,
    semFotos,
  };
}

function drawHeader(
  page: PDFPage,
  pageH: number,
  plan: BookPagePlan,
  serif: PDFFont,
  sans: PDFFont,
  tinta: RGB,
  acento: RGB,
): void {
  page.drawText(plan.titulo, {
    x: mm(BOOK_MARGIN_MM),
    y: pageH - mm(BOOK_MARGIN_MM + 8),
    size: mm(5.5),
    font: serif,
    color: tinta,
  });
  page.drawText(String(plan.numero), {
    x: mm(BOOK_PAGE_MM.width - BOOK_MARGIN_MM - 8),
    y: pageH - mm(BOOK_MARGIN_MM + 8),
    size: mm(3.5),
    font: sans,
    color: acento,
  });
}
