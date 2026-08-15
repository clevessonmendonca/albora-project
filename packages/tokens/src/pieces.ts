import { contraste, lerHex } from "./cor";
import type { Colors } from "./types";

/**
 * As regras da peça impressa (spec 009).
 *
 * Vivem aqui e não no `core` por um motivo só: a regra central é *"a
 * identidade colore a peça, nunca o código"*, e decidir isso exige a mesma
 * matemática de contraste que já resolve o texto. Duplicá-la no `core` criaria
 * o segundo resolvedor que o ADR 0003 existe para impedir — e a divergência
 * apareceria em papel, depois de impresso.
 *
 * Nada aqui desenha. São medidas e recusas: quem desenha é o pipeline
 * SVG → PDF. Uma peça vetorial cabe no request; raster a 300 dpi iria para fila.
 */

/** Sangria: o corte da gráfica nunca cai exatamente na linha. */
export const BLEED_MM = 3;

/** Área de segurança: nada de conteúdo entre a borda e esta margem. */
export const SAFE_AREA_MM = 5;

/**
 * O menor QR que sobrevive à festa.
 *
 * O papel vai ser dobrado, molhado e fotografado tremido de 40 cm, com a luz
 * do salão. Abaixo disto o gerador **recusa**: recusar na geração é barato, e
 * descobrir na festa é irreversível.
 */
export const QR_MIN_MM = 30;

/**
 * O contraste que o código exige, acima do que o texto exige.
 *
 * 4.5 é o limiar de leitura humana; o sensor de um celular velho em luz baixa
 * é pior que o olho. 7 é a margem que separa "escaneia na tela" de "escaneia
 * no papel", que é o modo de falha que a spec chama de mais caro do produto.
 */
export const QR_CONTRAST_RATIO = 7;

/** Preto e branco absolutos. O último recurso quando a identidade não dá conta. */
const BLACK = "#000000";
const WHITE = "#FFFFFF";

export type PieceFormat = "placa-a4" | "card-de-mesa" | "card-de-missao";

export type PieceMeasures = {
  formato: PieceFormat;
  /** Milímetros, sem a sangria. */
  largura: number;
  altura: number;
  /** O lado do QR, em milímetros. */
  qr: number;
};

const MEASURES: Record<PieceFormat, Omit<PieceMeasures, "formato">> = {
  "placa-a4": { largura: 210, altura: 297, qr: 90 },
  "card-de-mesa": { largura: 100, altura: 140, qr: 48 },
  "card-de-missao": { largura: 55, altura: 85, qr: 32 },
};

export function pieceMeasures(format: PieceFormat): PieceMeasures {
  return { formato: format, ...MEASURES[format] };
}

/** A caixa de corte, com sangria dos quatro lados. */
export function cutBox(piece: PieceMeasures): { largura: number; altura: number } {
  return {
    largura: piece.largura + BLEED_MM * 2,
    altura: piece.altura + BLEED_MM * 2,
  };
}

export type QrInk = {
  /** A cor dos módulos escuros. */
  modulo: string;
  /** O fundo, incluindo a zona de silêncio. */
  fundo: string;
  /**
   * `true` quando a identidade do evento não alcançou o contraste e a peça
   * caiu para preto sobre branco. O admin avisa; ninguém descobre no papel.
   */
  recuouParaAbsoluto: boolean;
};

/**
 * A tinta do código.
 *
 * Tenta vestir o QR com as cores do evento — tinta ou noite sobre papel — e
 * **recua para preto sobre branco** quando elas não alcançam o contraste.
 * Âmbar sobre noite é lindo no preview e não escaneia em luz baixa; a
 * identidade colore a moldura, o texto e o fundo da peça, nunca o código.
 */
export function qrInk(colors: Colors): QrInk {
  const background = colors.papel;
  const light = lerHex(background);

  const candidates = [colors.tinta, colors.noite]
    .map((hex) => ({ hex, rgb: lerHex(hex) }))
    .filter((candidate): candidate is { hex: string; rgb: NonNullable<ReturnType<typeof lerHex>> } => candidate.rgb !== null);

  if (!light || candidates.length === 0) {
    return absoluteInk();
  }

  const best = candidates.reduce((a, b) =>
    contraste(a.rgb, light) >= contraste(b.rgb, light) ? a : b,
  );

  if (contraste(best.rgb, light) < QR_CONTRAST_RATIO) {
    return absoluteInk();
  }

  return { modulo: best.hex, fundo: background, recuouParaAbsoluto: false };
}

function absoluteInk(): QrInk {
  return { modulo: BLACK, fundo: WHITE, recuouParaAbsoluto: true };
}

export type PieceLayout = {
  formato: PieceFormat;
  /** O lado do QR que o layout pediu, em milímetros. */
  qr: number;
  /** A URL curta impressa sob o código. Vazia é defeito, não estilo. */
  url: string;
  /** Distância do conteúdo até a borda cortada, em milímetros. */
  margem: number;
};

/**
 * Vazio quando a peça pode ir para a gráfica.
 *
 * Mesma convenção de `problemasDoPack`: cada string é um defeito, e a lista
 * vazia é a aprovação. O chamador decide se bloqueia o download ou só avisa —
 * mas ninguém gera um PDF sem passar por aqui.
 */
export function pieceProblems(layout: PieceLayout, colors: Colors): string[] {
  const problems: string[] = [];
  const measures = pieceMeasures(layout.formato);

  if (layout.qr < QR_MIN_MM) {
    problems.push(
      `o QR tem ${layout.qr} mm e o mínimo é ${QR_MIN_MM} mm — não escaneia depois de impresso`,
    );
  }

  if (layout.qr > Math.min(measures.largura, measures.altura) - SAFE_AREA_MM * 2) {
    problems.push("o QR não cabe dentro da área de segurança da peça");
  }

  if (layout.margem < SAFE_AREA_MM) {
    problems.push(
      `a margem tem ${layout.margem} mm e a área de segurança é ${SAFE_AREA_MM} mm — o corte come o conteúdo`,
    );
  }

  // Câmera velha, permissão de câmera negada, código riscado por uma taça: a
  // URL embaixo é o único caminho que sobra, e ela some primeiro em revisão
  // de layout porque "polui".
  if (layout.url.trim() === "") {
    problems.push("falta a URL legível sob o QR");
  }

  if (qrInk(colors).recuouParaAbsoluto) {
    problems.push(
      "a identidade não alcança o contraste do código: o QR sai em preto sobre branco",
    );
  }

  return problems;
}

/**
 * O aviso de cor, dado **antes** do download.
 *
 * A tela é RGB e a gráfica é CMYK; o âmbar sempre sai mais apagado no papel.
 * Avisar antes é expectativa e avisar depois é reclamação — por isso isto é
 * uma função no contrato, e não uma nota de rodapé que alguém esquece de pôr.
 */
export function colorWarning(colors: Colors): string {
  return `A tela mostra RGB e a gráfica imprime CMYK: ${colors.acento} vai sair um pouco mais apagado no papel. Peça uma prova impressa antes da tiragem inteira.`;
}
