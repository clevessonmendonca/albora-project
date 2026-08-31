import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { lerHex } from "@albora/tokens";
import { loadPrintFonts } from "./piece-fonts";
import { planPiece, type PieceInput, type PiecePlan } from "./piece-layout";

export type PiecePdfResult = {
  pdf: Uint8Array;
  avisos: string[];
  problemas: string[];
};

/** 1 mm = 72/25.4 pt. A página é a caixa de corte (formato + sangria 3 mm). */
const MM_TO_PT = 72 / 25.4;

function mm(n: number): number {
  return n * MM_TO_PT;
}

function cor(hex: string): RGB {
  const parsed = lerHex(hex);
  if (!parsed) return rgb(0, 0, 0);
  return rgb(parsed.r / 255, parsed.g / 255, parsed.b / 255);
}

function rectFromTop(
  page: PDFPage,
  pageHeight: number,
  xMm: number,
  yMm: number,
  widthMm: number,
  heightMm: number,
  color: RGB,
): void {
  page.drawRectangle({
    x: mm(xMm),
    y: pageHeight - mm(yMm) - mm(heightMm),
    width: mm(widthMm),
    height: mm(heightMm),
    color,
  });
}

function drawPlan(page: PDFPage, pageHeight: number, plano: PiecePlan, serif: PDFFont, sans: PDFFont): void {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: page.getWidth(),
    height: page.getHeight(),
    color: cor(plano.fundo),
  });

  rectFromTop(
    page,
    pageHeight,
    plano.papel.x,
    plano.papel.y,
    plano.papel.largura,
    plano.papel.altura,
    cor(plano.papel.fill),
  );

  rectFromTop(
    page,
    pageHeight,
    plano.qrFundo.x,
    plano.qrFundo.y,
    plano.qrFundo.lado,
    plano.qrFundo.lado,
    cor(plano.qrFundo.fill),
  );

  const modulo = cor(plano.qrModulo);
  for (const cell of plano.qrCelulas) {
    rectFromTop(page, pageHeight, cell.x, cell.y, cell.width, cell.height, modulo);
  }

  for (const t of plano.textos) {
    const font = t.font === "serif" ? serif : sans;
    const size = mm(t.size);
    const width = font.widthOfTextAtSize(t.value, size);
    page.drawText(t.value, {
      x: mm(t.x) - width / 2,
      y: pageHeight - mm(t.y),
      size,
      font,
      color: cor(t.fill),
    });
  }
}

export async function generatePiecePdf(entrada: PieceInput): Promise<PiecePdfResult> {
  const plano = planPiece(entrada);
  if (plano.problemas.length > 0) {
    return { pdf: new Uint8Array(), avisos: plano.avisos, problemas: plano.problemas };
  }

  const faces = loadPrintFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit as never);
  const serif = await doc.embedFont(faces.serif);
  const sans = await doc.embedFont(faces.sans);

  const page = doc.addPage([mm(plano.corte.largura), mm(plano.corte.altura)]);
  drawPlan(page, page.getHeight(), plano, serif, sans);

  doc.setTitle(entrada.titulo);
  doc.setSubject(entrada.urlQr);
  doc.setKeywords([entrada.urlLegivel]);
  doc.setProducer("Albora");

  return {
    pdf: await doc.save(),
    avisos: plano.avisos,
    problemas: [],
  };
}
