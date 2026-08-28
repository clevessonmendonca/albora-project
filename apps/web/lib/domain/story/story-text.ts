import type { TextoComposto } from "@albora/core";

/** Texto do composer (spec 020a) em canvas 2D: uma função para prévia e foto final — divergir as duas mostraria posição errada no álbum. */

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

/** Lê tokens já resolvidos no `:root` — canvas 2D não entende `var()`; equivale ao que o CSS faz, não é um segundo resolvedor (ADR 0003). */
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

/** Quebra em linhas que cabem em `larguraMaxima`; palavra única maior que a largura sai numa linha só — cortar no meio é pior que vazar. */
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

/** Desenha texto sobre o canvas (foto + LUT); coordenadas são frações 0–1 de largura/altura — resolução-independentes. Contorno + preenchimento, sem sombra: legível sobre qualquer foto. */
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
