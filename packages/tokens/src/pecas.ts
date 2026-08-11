import { contraste, lerHex } from "./cor";
import type { Cores } from "./tipos";

/**
 * As regras da peça impressa (spec 009).
 *
 * Vivem aqui e não no `core` por um motivo só: a regra central é *"a
 * identidade colore a peça, nunca o código"*, e decidir isso exige a mesma
 * matemática de contraste que já resolve o texto. Duplicá-la no `core` criaria
 * o segundo resolvedor que o ADR 0003 existe para impedir — e a divergência
 * apareceria em papel, depois de impresso.
 *
 * Nada aqui desenha. São medidas e recusas: quem rasteriza é o pipeline
 * SVG → PDF, em fila, nunca em request.
 */

/** Sangria: o corte da gráfica nunca cai exatamente na linha. */
export const SANGRIA_MM = 3;

/** Área de segurança: nada de conteúdo entre a borda e esta margem. */
export const AREA_SEGURA_MM = 5;

/**
 * O menor QR que sobrevive à festa.
 *
 * O papel vai ser dobrado, molhado e fotografado tremido de 40 cm, com a luz
 * do salão. Abaixo disto o gerador **recusa**: recusar na geração é barato, e
 * descobrir na festa é irreversível.
 */
export const QR_MINIMO_MM = 30;

/**
 * O contraste que o código exige, acima do que o texto exige.
 *
 * 4.5 é o limiar de leitura humana; o sensor de um celular velho em luz baixa
 * é pior que o olho. 7 é a margem que separa "escaneia na tela" de "escaneia
 * no papel", que é o modo de falha que a spec chama de mais caro do produto.
 */
export const CONTRASTE_DE_QR = 7;

/** Preto e branco absolutos. O último recurso quando a identidade não dá conta. */
const PRETO = "#000000";
const BRANCO = "#FFFFFF";

export type FormatoDePeca = "placa-a4" | "card-de-mesa" | "card-de-missao";

export type MedidasDaPeca = {
  formato: FormatoDePeca;
  /** Milímetros, sem a sangria. */
  largura: number;
  altura: number;
  /** O lado do QR, em milímetros. */
  qr: number;
};

const MEDIDAS: Record<FormatoDePeca, Omit<MedidasDaPeca, "formato">> = {
  "placa-a4": { largura: 210, altura: 297, qr: 90 },
  "card-de-mesa": { largura: 100, altura: 140, qr: 48 },
  "card-de-missao": { largura: 55, altura: 85, qr: 32 },
};

export function medidasDaPeca(formato: FormatoDePeca): MedidasDaPeca {
  return { formato, ...MEDIDAS[formato] };
}

/** A caixa de corte, com sangria dos quatro lados. */
export function caixaDeCorte(peca: MedidasDaPeca): { largura: number; altura: number } {
  return {
    largura: peca.largura + SANGRIA_MM * 2,
    altura: peca.altura + SANGRIA_MM * 2,
  };
}

export type TintaDoQr = {
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
export function tintaDoQr(cores: Cores): TintaDoQr {
  const fundo = cores.papel;
  const claro = lerHex(fundo);

  // A mais escura das duas ganha: `noite` costuma ser, mas um evento pode ter
  // trocado as duas e a decisão não pode depender do nome da cor.
  const candidatos = [cores.tinta, cores.noite]
    .map((hex) => ({ hex, rgb: lerHex(hex) }))
    .filter((c): c is { hex: string; rgb: NonNullable<ReturnType<typeof lerHex>> } => c.rgb !== null);

  if (!claro || candidatos.length === 0) {
    return { modulo: PRETO, fundo: BRANCO, recuouParaAbsoluto: true };
  }

  const melhor = candidatos.reduce((a, b) =>
    contraste(a.rgb, claro) >= contraste(b.rgb, claro) ? a : b,
  );

  if (contraste(melhor.rgb, claro) < CONTRASTE_DE_QR) {
    return { modulo: PRETO, fundo: BRANCO, recuouParaAbsoluto: true };
  }

  return { modulo: melhor.hex, fundo, recuouParaAbsoluto: false };
}

export type LayoutDePeca = {
  formato: FormatoDePeca;
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
export function problemasDaPeca(layout: LayoutDePeca, cores: Cores): string[] {
  const problemas: string[] = [];
  const medidas = medidasDaPeca(layout.formato);

  if (layout.qr < QR_MINIMO_MM) {
    problemas.push(
      `o QR tem ${layout.qr} mm e o mínimo é ${QR_MINIMO_MM} mm — não escaneia depois de impresso`,
    );
  }

  if (layout.qr > Math.min(medidas.largura, medidas.altura) - AREA_SEGURA_MM * 2) {
    problemas.push("o QR não cabe dentro da área de segurança da peça");
  }

  if (layout.margem < AREA_SEGURA_MM) {
    problemas.push(
      `a margem tem ${layout.margem} mm e a área de segurança é ${AREA_SEGURA_MM} mm — o corte come o conteúdo`,
    );
  }

  // Câmera velha, permissão de câmera negada, código riscado por uma taça: a
  // URL embaixo é o único caminho que sobra, e ela some primeiro em revisão
  // de layout porque "polui".
  if (layout.url.trim() === "") {
    problemas.push("falta a URL legível sob o QR");
  }

  if (tintaDoQr(cores).recuouParaAbsoluto) {
    problemas.push(
      "a identidade não alcança o contraste do código: o QR sai em preto sobre branco",
    );
  }

  return problemas;
}

/**
 * O aviso de cor, dado **antes** do download.
 *
 * A tela é RGB e a gráfica é CMYK; o âmbar sempre sai mais apagado no papel.
 * Avisar antes é expectativa e avisar depois é reclamação — por isso isto é
 * uma função no contrato, e não uma nota de rodapé que alguém esquece de pôr.
 */
export function avisoDeCor(cores: Cores): string {
  return `A tela mostra RGB e a gráfica imprime CMYK: ${cores.acento} vai sair um pouco mais apagado no papel. Peça uma prova impressa antes da tiragem inteira.`;
}
