import { planPiece, type PieceInput } from "./piece-layout";

export type { PieceInput };

export type PieceResult = {
  svg: string;
  avisos: string[];
  problemas: string[];
};

function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function familia(font: "serif" | "sans"): string {
  return font === "serif" ? "Fraunces, Georgia, serif" : '"Instrument Sans", system-ui, sans-serif';
}

export async function generatePieceSvg(entrada: PieceInput): Promise<PieceResult> {
  const plano = planPiece(entrada);
  if (plano.problemas.length > 0) {
    return { svg: "", avisos: plano.avisos, problemas: plano.problemas };
  }

  const textos = plano.textos
    .map((t) => {
      const weight = t.weight !== 400 ? ` font-weight="${t.weight}"` : "";
      return `<text x="${t.x}" y="${t.y}" text-anchor="middle" font-family="${familia(t.font)}" font-size="${t.size}"${weight} fill="${t.fill}">${escaparXml(t.value)}</text>`;
    })
    .join("\n  ");

  const celulas = plano.qrCelulas
    .map(
      (c) =>
        `<rect x="${c.x.toFixed(3)}" y="${c.y.toFixed(3)}" width="${c.width.toFixed(3)}" height="${c.height.toFixed(3)}" fill="${plano.qrModulo}"/>`,
    )
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${plano.corte.largura}mm" height="${plano.corte.altura}mm" viewBox="0 0 ${plano.corte.largura} ${plano.corte.altura}">
  <rect width="${plano.corte.largura}" height="${plano.corte.altura}" fill="${plano.fundo}"/>
  <rect x="${plano.papel.x}" y="${plano.papel.y}" width="${plano.papel.largura}" height="${plano.papel.altura}" fill="${plano.papel.fill}"/>
  ${textos}
  <rect x="${plano.qrFundo.x}" y="${plano.qrFundo.y}" width="${plano.qrFundo.lado}" height="${plano.qrFundo.lado}" fill="${plano.qrFundo.fill}"/>
  ${celulas}
</svg>`;

  return { svg, avisos: plano.avisos, problemas: [] };
}
