import type { Colors, PieceFormat } from "@albora/tokens";
import {
  BLEED_MM,
  SAFE_AREA_MM,
  colorWarning,
  cutBox,
  pieceMeasures,
  pieceProblems,
  qrInk,
} from "@albora/tokens";
import QRCode from "qrcode";
import { highlightedMissions } from "./piece-missions";

export type PieceInput = {
  formato: PieceFormat;
  urlQr: string;
  urlLegivel: string;
  monograma: string;
  titulo: string;
  data: string;
  cores: Colors;
  missoes?: readonly string[];
};

export type PieceText = {
  x: number;
  y: number;
  size: number;
  fill: string;
  font: "serif" | "sans";
  weight: number;
  value: string;
};

export type PieceCell = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PiecePlan = {
  avisos: string[];
  problemas: string[];
  corte: { largura: number; altura: number };
  fundo: string;
  papel: { x: number; y: number; largura: number; altura: number; fill: string };
  textos: PieceText[];
  qrFundo: { x: number; y: number; lado: number; fill: string };
  qrCelulas: PieceCell[];
  qrModulo: string;
};

const MARGEM_CONTEUDO_MM = 12;
const SILENCIO_QR_MODULOS = 4;
export const PIECE_INSTRUCTION = "Aponte para o QR da festa";

function alturaCabecalho(formato: PieceFormat): number {
  if (formato === "placa-a4") return 42;
  if (formato === "card-de-mesa") return 28;
  return 18;
}

function tamanhoFonte(formato: PieceFormat, papel: "mono" | "titulo" | "data" | "url"): number {
  const mapa = {
    "placa-a4": { mono: 14, titulo: 9, data: 4.5, url: 3.5 },
    "card-de-mesa": { mono: 9, titulo: 6, data: 3.5, url: 2.8 },
    "card-de-missao": { mono: 6, titulo: 4.2, data: 2.6, url: 2.2 },
  } as const;
  return mapa[formato][papel];
}

function wrapWords(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || current === "") {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

function missionTexts(opts: {
  formato: PieceFormat;
  titles: readonly string[];
  cx: number;
  afterY: number;
  bottomY: number;
  widthMm: number;
  fill: string;
}): PieceText[] {
  const titles = highlightedMissions(opts.formato, opts.titles);
  if (titles.length === 0) return [];

  const startSize = opts.formato === "placa-a4" ? 4.2 : 2.6;
  const minSize = opts.formato === "placa-a4" ? 2.8 : 2.0;
  const lineHeight = 1.28;
  const blockGap = opts.formato === "placa-a4" ? 12 : 4.5;
  const itemGapAt = (size: number) => (opts.formato === "placa-a4" ? size * 0.7 : size * 0.4);

  let size = startSize;
  let wrapped: string[][] = [];

  while (size >= minSize - 0.001) {
    const maxLen = Math.max(12, Math.floor(opts.widthMm / (size * 0.52)));
    wrapped = titles.map((t) => wrapWords(t, maxLen));
    const gap = itemGapAt(size);
    const used = wrapped.reduce(
      (h, lines, i) => h + lines.length * size * lineHeight + (i < wrapped.length - 1 ? gap : 0),
      0,
    );
    if (opts.afterY + blockGap + used <= opts.bottomY) break;
    size -= 0.15;
  }

  const gap = itemGapAt(size);
  const texts: PieceText[] = [];
  let y = opts.afterY + blockGap;
  for (let i = 0; i < wrapped.length; i++) {
    for (const line of wrapped[i] ?? []) {
      y += size * lineHeight;
      texts.push({
        x: opts.cx,
        y,
        size,
        fill: opts.fill,
        font: "sans",
        weight: 400,
        value: line,
      });
    }
    y += gap;
  }
  return texts;
}

function qrCelulas(
  conteudo: string,
  x: number,
  y: number,
  ladoMm: number,
): { fundo: { x: number; y: number; lado: number }; celulas: PieceCell[] } {
  const qr = QRCode.create(conteudo, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const total = n + SILENCIO_QR_MODULOS * 2;
  const celula = ladoMm / total;
  const celulas: PieceCell[] = [];

  for (let row = 0; row < n; row++) {
    let run = 0;
    for (let col = 0; col <= n; col++) {
      const dark = col < n && qr.modules.get(row, col);
      if (dark) {
        run += 1;
        continue;
      }
      if (run === 0) continue;
      const start = col - run;
      celulas.push({
        x: x + (start + SILENCIO_QR_MODULOS) * celula,
        y: y + (row + SILENCIO_QR_MODULOS) * celula,
        width: celula * run,
        height: celula,
      });
      run = 0;
    }
  }

  return { fundo: { x, y, lado: ladoMm }, celulas };
}

export function planPiece(entrada: PieceInput): PiecePlan {
  const medidas = pieceMeasures(entrada.formato);
  const corte = cutBox(medidas);
  const margem = Math.max(MARGEM_CONTEUDO_MM, SAFE_AREA_MM);
  const problemas = pieceProblems(
    {
      formato: entrada.formato,
      qr: medidas.qr,
      url: entrada.urlLegivel,
      margem,
    },
    entrada.cores,
  );
  const avisos = [colorWarning(entrada.cores)];
  const tinta = qrInk(entrada.cores);

  if (problemas.length > 0) {
    return {
      avisos,
      problemas,
      corte,
      fundo: entrada.cores.papel,
      papel: { x: 0, y: 0, largura: 0, altura: 0, fill: entrada.cores.papel },
      textos: [],
      qrFundo: { x: 0, y: 0, lado: 0, fill: tinta.fundo },
      qrCelulas: [],
      qrModulo: tinta.modulo,
    };
  }

  const ox = BLEED_MM;
  const oy = BLEED_MM;
  const cx = ox + medidas.largura / 2;
  const cabecalho = alturaCabecalho(entrada.formato);
  const fsMono = tamanhoFonte(entrada.formato, "mono");
  const fsTitulo = tamanhoFonte(entrada.formato, "titulo");
  const fsData = tamanhoFonte(entrada.formato, "data");
  const fsUrl = tamanhoFonte(entrada.formato, "url");
  const qrX = cx - medidas.qr / 2;
  const qrY = oy + margem + cabecalho;
  const urlY = qrY + medidas.qr + 6;
  const qr = qrCelulas(entrada.urlQr, qrX, qrY, medidas.qr);

  if (tinta.recuouParaAbsoluto) {
    avisos.push("O QR saiu em preto sobre branco porque a identidade não alcança o contraste exigido.");
  }

  const instrucaoY = urlY + fsUrl + 3;
  const missoes = missionTexts({
    formato: entrada.formato,
    titles: entrada.missoes ?? [],
    cx,
    afterY: instrucaoY,
    bottomY: oy + medidas.altura - margem,
    widthMm: medidas.largura - margem * 2,
    fill: entrada.cores.tinta,
  });

  return {
    avisos,
    problemas: [],
    corte,
    fundo: entrada.cores.papel,
    papel: {
      x: ox,
      y: oy,
      largura: medidas.largura,
      altura: medidas.altura,
      fill: entrada.cores.papel,
    },
    textos: [
      {
        x: cx,
        y: oy + margem + fsMono,
        size: fsMono,
        fill: entrada.cores.acento,
        font: "serif",
        weight: 600,
        value: entrada.monograma,
      },
      {
        x: cx,
        y: oy + margem + fsMono + fsTitulo + 2,
        size: fsTitulo,
        fill: entrada.cores.tinta,
        font: "serif",
        weight: 400,
        value: entrada.titulo,
      },
      {
        x: cx,
        y: oy + margem + fsMono + fsTitulo + fsData + 4,
        size: fsData,
        fill: entrada.cores.tinta,
        font: "sans",
        weight: 400,
        value: entrada.data,
      },
      {
        x: cx,
        y: urlY,
        size: fsUrl,
        fill: entrada.cores.tinta,
        font: "sans",
        weight: 400,
        value: entrada.urlLegivel,
      },
      {
        x: cx,
        y: instrucaoY,
        size: fsUrl,
        fill: entrada.cores.tinta,
        font: "sans",
        weight: 400,
        value: PIECE_INSTRUCTION,
      },
      ...missoes,
    ],
    qrFundo: { ...qr.fundo, fill: tinta.fundo },
    qrCelulas: qr.celulas,
    qrModulo: tinta.modulo,
  };
}
