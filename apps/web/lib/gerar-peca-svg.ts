import type { Cores, FormatoDePeca } from "@albora/tokens";
import {
  AREA_SEGURA_MM,
  SANGRIA_MM,
  avisoDeCor,
  caixaDeCorte,
  medidasDaPeca,
  problemasDaPeca,
  tintaDoQr,
} from "@albora/tokens";
import QRCode from "qrcode";

export type EntradaDaPeca = {
  formato: FormatoDePeca;
  urlQr: string;
  urlLegivel: string;
  monograma: string;
  titulo: string;
  data: string;
  cores: Cores;
};

export type ResultadoDaPeca = {
  svg: string;
  avisos: string[];
  problemas: string[];
};

const MARGEM_CONTEUDO_MM = 12;
const SILENCIO_QR_MODULOS = 4;

function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function modulosQr(
  conteudo: string,
  x: number,
  y: number,
  ladoMm: number,
  modulo: string,
  fundo: string,
): string {
  const qr = QRCode.create(conteudo, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const total = n + SILENCIO_QR_MODULOS * 2;
  const celula = ladoMm / total;

  let partes = `<rect x="${x}" y="${y}" width="${ladoMm}" height="${ladoMm}" fill="${fundo}"/>`;

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!qr.modules.get(row, col)) continue;
      const px = x + (col + SILENCIO_QR_MODULOS) * celula;
      const py = y + (row + SILENCIO_QR_MODULOS) * celula;
      partes += `<rect x="${px.toFixed(3)}" y="${py.toFixed(3)}" width="${celula.toFixed(3)}" height="${celula.toFixed(3)}" fill="${modulo}"/>`;
    }
  }

  return partes;
}

function alturaCabecalho(formato: FormatoDePeca): number {
  if (formato === "placa-a4") return 42;
  if (formato === "card-de-mesa") return 28;
  return 18;
}

function tamanhoFonte(formato: FormatoDePeca, papel: "mono" | "titulo" | "data" | "url"): number {
  const mapa = {
    "placa-a4": { mono: 14, titulo: 9, data: 4.5, url: 3.5 },
    "card-de-mesa": { mono: 9, titulo: 6, data: 3.5, url: 2.8 },
    "card-de-missao": { mono: 6, titulo: 4.2, data: 2.6, url: 2.2 },
  } as const;
  return mapa[formato][papel];
}

export async function gerarPecaSvg(entrada: EntradaDaPeca): Promise<ResultadoDaPeca> {
  const medidas = medidasDaPeca(entrada.formato);
  const corte = caixaDeCorte(medidas);
  const margem = Math.max(MARGEM_CONTEUDO_MM, AREA_SEGURA_MM);
  const layout = {
    formato: entrada.formato,
    qr: medidas.qr,
    url: entrada.urlLegivel,
    margem,
  };

  const problemas = problemasDaPeca(layout, entrada.cores);
  const avisos = [avisoDeCor(entrada.cores)];
  const tinta = tintaDoQr(entrada.cores);

  if (problemas.length > 0) {
    return { svg: "", avisos, problemas };
  }

  const ox = SANGRIA_MM;
  const oy = SANGRIA_MM;
  const cx = ox + medidas.largura / 2;
  const cabecalho = alturaCabecalho(entrada.formato);

  const qrX = cx - medidas.qr / 2;
  const qrY = oy + margem + cabecalho;
  const urlY = qrY + medidas.qr + 6;

  const mono = escaparXml(entrada.monograma);
  const titulo = escaparXml(entrada.titulo);
  const data = escaparXml(entrada.data);
  const url = escaparXml(entrada.urlLegivel);

  const fsMono = tamanhoFonte(entrada.formato, "mono");
  const fsTitulo = tamanhoFonte(entrada.formato, "titulo");
  const fsData = tamanhoFonte(entrada.formato, "data");
  const fsUrl = tamanhoFonte(entrada.formato, "url");

  const qr = modulosQr(entrada.urlQr, qrX, qrY, medidas.qr, tinta.modulo, tinta.fundo);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${corte.largura}mm" height="${corte.altura}mm" viewBox="0 0 ${corte.largura} ${corte.altura}">
  <rect width="${corte.largura}" height="${corte.altura}" fill="${entrada.cores.papel}"/>
  <rect x="${ox}" y="${oy}" width="${medidas.largura}" height="${medidas.altura}" fill="${entrada.cores.papel}"/>
  <text x="${cx}" y="${oy + margem + fsMono}" text-anchor="middle" font-family="Georgia, serif" font-size="${fsMono}" font-weight="600" fill="${entrada.cores.acento}">${mono}</text>
  <text x="${cx}" y="${oy + margem + fsMono + fsTitulo + 2}" text-anchor="middle" font-family="Georgia, serif" font-size="${fsTitulo}" fill="${entrada.cores.tinta}">${titulo}</text>
  <text x="${cx}" y="${oy + margem + fsMono + fsTitulo + fsData + 4}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${fsData}" fill="${entrada.cores.tinta}">${data}</text>
  ${qr}
  <text x="${cx}" y="${urlY}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${fsUrl}" fill="${entrada.cores.tinta}">${url}</text>
</svg>`;

  if (tinta.recuouParaAbsoluto) {
    avisos.push("O QR saiu em preto sobre branco porque a identidade não alcança o contraste exigido.");
  }

  return { svg, avisos, problemas: [] };
}
