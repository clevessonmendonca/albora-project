import { inflateRawSync } from "node:zlib";
import { ALBORA_BRAND } from "@albora/tokens";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { packPrintPieces, pieceFilename, PRINT_FORMATS } from "./pack-print-pieces";

const entradaBase = {
  urlQr: "https://albora.app/e/festa-demo?via=qr",
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

function unzip(zip: Uint8Array): Map<string, Uint8Array> {
  const buf = Buffer.from(zip);
  const out = new Map<string, Uint8Array>();
  let i = 0;
  while (i + 4 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const method = buf.readUInt16LE(i + 8);
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const name = buf.subarray(i + 30, i + 30 + nameLen).toString("utf8");
    const dataStart = i + 30 + nameLen + extraLen;
    const compressed = buf.subarray(dataStart, dataStart + compSize);
    const data = method === 8 ? inflateRawSync(compressed) : compressed;
    out.set(name, new Uint8Array(data));
    i = dataStart + compSize;
  }
  return out;
}

describe("packPrintPieces", { timeout: 30_000 }, () => {
  it("ZIP padrão traz os três PDFs da gráfica, sem SVG", async () => {
    const resultado = await packPrintPieces(entradaBase, { slug: "festa-demo" });

    expect(resultado.problemas).toEqual([]);
    expect(resultado.arquivos).toEqual([
      "albora-festa-demo-placa-a4.pdf",
      "albora-festa-demo-card-de-mesa.pdf",
      "albora-festa-demo-card-de-missao.pdf",
    ]);

    const files = unzip(resultado.zip);
    expect([...files.keys()]).toEqual(resultado.arquivos);

    for (const formato of PRINT_FORMATS) {
      const nome = pieceFilename("festa-demo", formato, "pdf");
      const pdf = files.get(nome);
      expect(pdf).toBeDefined();
      if (!pdf) continue;
      expect(Buffer.from(pdf.subarray(0, 5)).toString("latin1")).toBe("%PDF-");
      const doc = await PDFDocument.load(pdf);
      expect(doc.getPageCount()).toBe(1);
      expect(doc.getKeywords()).toContain("festa-demo");
    }

    expect([...files.keys()].some((n) => n.endsWith(".svg"))).toBe(false);
  });

  it("svg=1 acrescenta os três SVG sem tirar os PDF", async () => {
    const resultado = await packPrintPieces(entradaBase, { slug: "festa-demo", includeSvg: true });

    expect(resultado.problemas).toEqual([]);
    expect(resultado.arquivos).toHaveLength(6);

    const files = unzip(resultado.zip);
    expect(files.get("albora-festa-demo-placa-a4.svg")).toBeDefined();
    const svg = new TextDecoder().decode(files.get("albora-festa-demo-placa-a4.svg"));
    expect(svg).toContain("<svg");
    expect(svg).toContain("albora.app/e/festa-demo");
    expect(svg).not.toContain("via=qr");
    expect(svg).toContain("A chegada de quem você não via há tempos");
    expect(files.get("albora-festa-demo-placa-a4.pdf")?.byteLength).toBeGreaterThan(4_000);
  });

  it("recusa o pacote inteiro se a URL legível falta", async () => {
    const resultado = await packPrintPieces(
      { ...entradaBase, urlLegivel: "" },
      { slug: "festa-demo" },
    );

    expect(resultado.problemas.length).toBeGreaterThan(0);
    expect(resultado.zip.byteLength).toBe(0);
    expect(resultado.arquivos).toEqual([]);
  });
});
