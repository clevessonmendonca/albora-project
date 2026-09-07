import { ALBORA_BRAND, cutBox, pieceMeasures } from "@albora/tokens";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { generatePiecePdf } from "./generate-piece-pdf";

const entradaBase = {
  urlQr: "https://albora.app/e/festa-demo",
  urlLegivel: "albora.app/e/festa-demo",
  monograma: "AJ",
  titulo: "Ana & João",
  data: "12 de agosto de 2026",
  cores: ALBORA_BRAND.cores,
  missoes: [
    "A chegada de quem você não via há tempos",
    "A sua mesa, do jeito que ela está agora",
    "Alguém dançando como se ninguém visse",
    "O brinde, no instante do brinde",
  ],
};

function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

describe("generatePiecePdf", { timeout: 60_000 }, () => {
  it("devolve %PDF com tamanho não trivial, QR e slug", async () => {
    const resultado = await generatePiecePdf({ ...entradaBase, formato: "placa-a4" });

    expect(resultado.problemas).toEqual([]);
    expect(resultado.pdf.byteLength).toBeGreaterThan(4_000);
    expect(Buffer.from(resultado.pdf.subarray(0, 5)).toString("latin1")).toBe("%PDF-");

    const doc = await PDFDocument.load(resultado.pdf);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getSubject()).toBe(entradaBase.urlQr);
    expect(doc.getKeywords()).toContain("festa-demo");

    const corte = cutBox(pieceMeasures("placa-a4"));
    const page = doc.getPages()[0];
    expect(page).toBeDefined();
    if (!page) return;
    expect(page.getWidth()).toBeCloseTo(mmToPt(corte.largura), 1);
    expect(page.getHeight()).toBeCloseTo(mmToPt(corte.altura), 1);
  });

  it("não quebra em nomes com acento e embute glifo de ç", async () => {
    const resultado = await generatePiecePdf({
      ...entradaBase,
      formato: "card-de-mesa",
      monograma: "CJ",
      titulo: "Conceição & José",
    });

    expect(resultado.problemas).toEqual([]);
    expect(resultado.pdf.byteLength).toBeGreaterThan(4_000);
    const doc = await PDFDocument.load(resultado.pdf);
    expect(doc.getTitle()).toBe("Conceição & José");
  });

  it("recusa peça sem URL legível", async () => {
    const resultado = await generatePiecePdf({
      ...entradaBase,
      formato: "card-de-missao",
      urlLegivel: "",
    });

    expect(resultado.problemas.length).toBeGreaterThan(0);
    expect(resultado.pdf.byteLength).toBe(0);
  });

  it("gera os três formatos válidos", async () => {
    for (const formato of ["placa-a4", "card-de-mesa", "card-de-missao"] as const) {
      const resultado = await generatePiecePdf({ ...entradaBase, formato });
      expect(resultado.problemas).toEqual([]);
      expect(Buffer.from(resultado.pdf.subarray(0, 4)).toString("latin1")).toBe("%PDF");
      const doc = await PDFDocument.load(resultado.pdf);
      expect(doc.getKeywords()).toContain(entradaBase.urlLegivel);
    }
  });

});
