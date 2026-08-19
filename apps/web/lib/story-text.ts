import type { TextoComposto } from "@albora/core";

/**
 * O texto do composer (spec 020, sub-etapa a), desenhado num canvas 2D.
 *
 * Uma função só, dois chamadores: a prévia do editor (`EditorCanvas`, no
 * mesmo `<canvas>` que já aplica o LUT) e a foto final (`webDrawer.compor`,
 * na mesma passagem de cor de `processarFoto`). Divergir as duas seria a
 * story mostrar uma posição na prévia e sair com outra no álbum.
 */

type Ctx2d = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export type EstiloTextoDoStory = {
  /** Cor do texto — token `--ink`, já resolvido pelo :root do evento. */
  cor: string;
  /** Cor do contorno — token `--bg`, o par de contraste do `--ink`. */
  contorno: string;
  /** Família de fonte — token `--fonte-titulo`, sem aspas. */
  fonte: string;
};

const COR_TOKEN = "--ink";
const CONTORNO_TOKEN = "--bg";
const FONTE_TOKEN = "--fonte-titulo";

/**
 * Lê o valor **já resolvido** dos tokens do evento no `:root` — o mesmo valor
 * que o resto da superfície do convidado usa via `var(--ink)` em CSS. O
 * canvas 2D não entende `var()`; isto é o equivalente em JS do que o CSS já
 * faz sozinho, não um segundo resolvedor de tokens (ADR 0003, um só).
 */
export function estiloTextoDoStory(
  raiz: HTMLElement = document.documentElement,
): EstiloTextoDoStory {
  const computado = getComputedStyle(raiz);
  const ler = (token: string, alternativa: string) =>
    computado.getPropertyValue(token).trim() || alternativa;

  return {
    cor: ler(COR_TOKEN, "black"),
    contorno: ler(CONTORNO_TOKEN, "white"),
    fonte: ler(FONTE_TOKEN, "sans-serif").replace(/"/g, "").trim(),
  };
}

const LARGURA_MAXIMA_FRACAO = 0.86;
const ALTURA_LINHA_FRACAO = 1.22;
const CONTORNO_FRACAO = 0.08;

/**
 * Quebra em linhas que cabem em `larguraMaxima`, palavra a palavra.
 *
 * Uma palavra sozinha maior que a largura não é cortada — sai numa linha só,
 * mais larga: cortar no meio da palavra é pior que deixar vazar.
 */
export function quebrarLinhas(ctx: Ctx2d, conteudo: string, larguraMaxima: number): string[] {
  const palavras = conteudo.trim().split(/\s+/);
  const linhas: string[] = [];
  let atual = "";

  for (const palavra of palavras) {
    const candidata = atual ? `${atual} ${palavra}` : palavra;
    if (atual && ctx.measureText(candidata).width > larguraMaxima) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = candidata;
    }
  }
  if (atual) linhas.push(atual);

  return linhas;
}

/**
 * Desenha o texto do composer sobre o que já está no canvas — a foto, já
 * com o LUT aplicado (ou a prévia dela).
 *
 * `texto.x`/`texto.y` são o centro do bloco de texto, fração 0–1 de
 * `largura`/`altura`; `texto.tamanho` é a fonte, fração 0–1 de `largura`. As
 * três são resolução-independentes de propósito: a mesma story vale para a
 * prévia de 1000 px e para a foto em tamanho de subida sem recálculo.
 *
 * Contorno mais preenchimento, sem sombra: legível sobre qualquer foto —
 * clara, escura, texturada — sem depender de a foto combinar com o tema do
 * evento, que é o problema que o Instagram resolve do mesmo jeito.
 */
export function desenharTextoNoContexto(
  ctx: Ctx2d,
  largura: number,
  altura: number,
  texto: TextoComposto,
  estilo: EstiloTextoDoStory,
): void {
  const conteudo = texto.conteudo.trim();
  if (!conteudo) return;

  const tamanhoFonte = Math.max(1, Math.round(texto.tamanho * largura));
  ctx.font = `600 ${tamanhoFonte}px ${estilo.fonte}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  const linhas = quebrarLinhas(ctx, conteudo, largura * LARGURA_MAXIMA_FRACAO);
  const alturaLinha = tamanhoFonte * ALTURA_LINHA_FRACAO;
  const cx = texto.x * largura;
  const cy = texto.y * altura;
  const topo = cy - (alturaLinha * (linhas.length - 1)) / 2;

  ctx.strokeStyle = estilo.contorno;
  ctx.lineWidth = Math.max(1, tamanhoFonte * CONTORNO_FRACAO);
  ctx.fillStyle = estilo.cor;

  linhas.forEach((linha, i) => {
    const y = topo + i * alturaLinha;
    ctx.strokeText(linha, cx, y);
    ctx.fillText(linha, cx, y);
  });
}
