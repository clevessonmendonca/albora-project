"use client";

import {
  ALTURA_DA_COMPOSICAO,
  LARGURA_DA_COMPOSICAO,
  celulasDaColagem,
  encaixar,
  faixaDaMarca,
  type Composicao,
  type ConteudoDaMoldura,
} from "@albora/core";
import { MARCA_ALBORA, paraVariaveis } from "@albora/tokens";

const PADRAO = paraVariaveis(MARCA_ALBORA);

function corCss(nome: keyof typeof PADRAO): string {
  const bruto = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  return bruto || PADRAO[nome]!;
}

function desenharFoto(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  imagem: CanvasImageSource,
  composicao: Composicao,
) {
  const { area, foto, modelo } = composicao;

  if (modelo === "ambiente") {
    ctx.save();
    ctx.filter = "blur(32px) brightness(0.85)";
    ctx.drawImage(imagem, area.x, area.y, area.largura, area.altura);
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.largura, area.altura);
  ctx.clip();
  ctx.drawImage(imagem, foto.x, foto.y, foto.largura, foto.altura);
  ctx.restore();
}

function desenharFaixaConteudo(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  faixa: Composicao["faixa"],
  conteudo: ConteudoDaMoldura,
) {
  const superficie = corCss("--superficie");
  const ink = corCss("--ink");
  const ink2 = corCss("--ink-2");
  const acento = corCss("--acento");
  const fonteTitulo = corCss("--fonte-titulo").replace(/"/g, "");
  const fonteCorpo = corCss("--fonte-corpo").replace(/"/g, "");

  ctx.fillStyle = superficie;
  ctx.fillRect(faixa.x, faixa.y, faixa.largura, faixa.altura);

  const cx = LARGURA_DA_COMPOSICAO / 2;
  let y = faixa.y + 72;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = acento;
  ctx.font = `600 64px ${fonteTitulo}`;
  ctx.fillText(conteudo.monograma, cx, y);
  y += 56;

  ctx.fillStyle = ink;
  ctx.font = `400 36px ${fonteTitulo}`;
  ctx.fillText(conteudo.titulo, cx, y);
  y += 44;

  ctx.fillStyle = ink2;
  ctx.font = `400 26px ${fonteCorpo}`;
  ctx.fillText(conteudo.data, cx, y);
  y += 36;

  if (conteudo.credito) {
    ctx.fillText(conteudo.credito, cx, y);
    y += 32;
  }

  if (conteudo.legenda) {
    ctx.font = `400 22px ${fonteCorpo}`;
    const legenda =
      conteudo.legenda.length > 80 ? `${conteudo.legenda.slice(0, 77)}…` : conteudo.legenda;
    ctx.fillText(legenda, cx, y);
    y += 32;
  }

  ctx.font = `400 22px ${fonteCorpo}`;
  ctx.fillText(`albora.app/e/${conteudo.slug}`, cx, faixa.y + faixa.altura - 36);
}

function desenharFaixa(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  composicao: Composicao,
) {
  desenharFaixaConteudo(ctx, composicao.faixa, composicao.conteudo);
}

type Ctx2d = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function ctx2d(canvas: OffscreenCanvas | HTMLCanvasElement): Ctx2d {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2D indisponível");
  return ctx as Ctx2d;
}

function criarCanvas(): OffscreenCanvas | HTMLCanvasElement {
  return typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(LARGURA_DA_COMPOSICAO, ALTURA_DA_COMPOSICAO)
    : Object.assign(document.createElement("canvas"), {
        width: LARGURA_DA_COMPOSICAO,
        height: ALTURA_DA_COMPOSICAO,
      });
}

async function canvasParaBlob(canvas: OffscreenCanvas | HTMLCanvasElement): Promise<Blob> {
  if ("convertToBlob" in canvas && typeof canvas.convertToBlob === "function") {
    return canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
  }

  return new Promise((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("falha ao codificar"))),
      "image/jpeg",
      0.9,
    );
  });
}

/** Quinto renderizador: moldura 9:16 com tokens do evento (spec 015). */
export async function drawFrame(
  imagem: CanvasImageSource,
  composicao: Composicao,
): Promise<Blob> {
  const canvas = criarCanvas();
  const ctx = ctx2d(canvas);

  ctx.fillStyle = corCss("--bg");
  ctx.fillRect(0, 0, LARGURA_DA_COMPOSICAO, ALTURA_DA_COMPOSICAO);

  desenharFoto(ctx, imagem, composicao);
  desenharFaixa(ctx, composicao);

  return canvasParaBlob(canvas);
}

/** Colagem da noite — até quatro fotos do convidado (spec 015). */
export async function drawCollage(
  fotos: { img: CanvasImageSource; largura: number; altura: number }[],
  conteudo: ConteudoDaMoldura,
): Promise<Blob> {
  const canvas = criarCanvas();
  const ctx = ctx2d(canvas);

  ctx.fillStyle = corCss("--bg");
  ctx.fillRect(0, 0, LARGURA_DA_COMPOSICAO, ALTURA_DA_COMPOSICAO);

  const celulas = celulasDaColagem(fotos.length);
  for (let i = 0; i < fotos.length; i += 1) {
    const foto = fotos[i]!;
    const celula = celulas[i]!;
    const caixa = encaixar({ largura: foto.largura, altura: foto.altura }, celula);
    ctx.drawImage(foto.img, caixa.x, caixa.y, caixa.largura, caixa.altura);
  }

  desenharFaixaConteudo(ctx, faixaDaMarca(), conteudo);

  return canvasParaBlob(canvas);
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("imagem indisponível"));
    img.src = url;
  });
  return img;
}

export async function shareOrDownload(blob: Blob, nomeArquivo: string) {
  const arquivo = new File([blob], nomeArquivo, { type: blob.type || "image/jpeg" });

  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [arquivo] })) {
    await navigator.share({ files: [arquivo] });
    return "compartilhado" as const;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
  return "baixado" as const;
}
