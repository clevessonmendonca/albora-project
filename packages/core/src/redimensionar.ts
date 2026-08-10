import { LADO_MAIOR } from "./midia";

/**
 * Quanto reduzir, e quando desistir de reduzir.
 *
 * Pura de propósito: é a parte da pipeline de imagem que decide se um
 * aparelho de quatro anos conclui o upload ou fica sem memória, e essa
 * decisão precisa ser testável sem canvas, sem navegador e sem aparelho.
 */

export type Plano = "gratis" | "pago";

export type Alvo = { largura: number; altura: number };

export const LADO_THUMB = 320;

/**
 * A qualidade cai junto com o tamanho porque artefato de compressão é menos
 * visível em imagem menor — e o que importa aqui é o peso no 3G do salão.
 */
export const QUALIDADE = { full: 0.82, thumb: 0.7 } as const;

/**
 * Reduz mantendo proporção, **nunca aumenta**.
 *
 * Ampliar uma foto pequena não acrescenta informação: só gasta banda do
 * convidado e memória do aparelho para entregar a mesma imagem borrada.
 */
export function alvoParaLadoMaior(largura: number, altura: number, ladoMaior: number): Alvo {
  const maior = Math.max(largura, altura);
  if (maior <= ladoMaior) return { largura, altura };

  const fator = ladoMaior / maior;
  return {
    largura: Math.max(1, Math.round(largura * fator)),
    altura: Math.max(1, Math.round(altura * fator)),
  };
}

export function alvoFull(largura: number, altura: number, plano: Plano): Alvo {
  return alvoParaLadoMaior(largura, altura, LADO_MAIOR[plano]);
}

export function alvoThumb(largura: number, altura: number): Alvo {
  return alvoParaLadoMaior(largura, altura, LADO_THUMB);
}

/**
 * Teto de pixels que o aparelho aguenta num canvas.
 *
 * O Safari do iOS derruba canvas acima de um limite de área e devolve tela
 * em branco — **sem erro**. Um Android antigo simplesmente mata a aba. Os
 * dois modos de falha são silenciosos, e é por isso que existe um teto em
 * vez de um try/catch.
 */
export const TETO_PIXELS = {
  /** Aparelho declarado de pouca memória, ou detectado como antigo. */
  modesto: 2048 * 2048,
  padrao: 4096 * 4096,
} as const;

/**
 * Degrada a resolução até caber no teto do aparelho — **degradar, nunca
 * falhar**.
 *
 * Uma foto menor entra no álbum. Uma foto que não processa vira convidado
 * que desiste, e o custo disso é participação, que é a única métrica que
 * decide o produto.
 */
export function alvoQueCabe(alvo: Alvo, tetoPixels: number): Alvo {
  const pixels = alvo.largura * alvo.altura;
  if (pixels <= tetoPixels) return alvo;

  const fator = Math.sqrt(tetoPixels / pixels);
  return {
    largura: Math.max(1, Math.floor(alvo.largura * fator)),
    altura: Math.max(1, Math.floor(alvo.altura * fator)),
  };
}

export type Aparelho = { memoriaGb?: number | undefined; nucleos?: number | undefined };

/**
 * Escolhe o teto a partir do que o navegador informa.
 *
 * Na dúvida assume o padrão: um aparelho capaz tratado como modesto entrega
 * foto pior a todo mundo, e a maioria dos aparelhos numa festa é capaz. O
 * caso modesto é exceção, e exceção não pode virar regra por precaução.
 */
export function tetoParaAparelho(aparelho: Aparelho): number {
  const { memoriaGb, nucleos } = aparelho;

  if (typeof memoriaGb === "number" && memoriaGb <= 2) return TETO_PIXELS.modesto;
  if (typeof nucleos === "number" && nucleos <= 2) return TETO_PIXELS.modesto;

  return TETO_PIXELS.padrao;
}

/** O alvo final: plano, orientação já aplicada, e o que o aparelho aguenta. */
export function planejarProcessamento(entrada: {
  largura: number;
  altura: number;
  plano: Plano;
  aparelho: Aparelho;
}): { full: Alvo; thumb: Alvo; qualidade: typeof QUALIDADE } {
  const teto = tetoParaAparelho(entrada.aparelho);
  const full = alvoQueCabe(alvoFull(entrada.largura, entrada.altura, entrada.plano), teto);

  return {
    full,
    // A miniatura sai do alvo já reduzido, não do original: reprocessar o
    // original dobraria o pico de memória no aparelho mais fraco.
    thumb: alvoThumb(full.largura, full.altura),
    qualidade: QUALIDADE,
  };
}
