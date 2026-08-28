"use client";

import {
  ALTURA_DA_COMPOSICAO,
  LARGURA_DA_COMPOSICAO,
  celulasDaColagem,
  faixaDaMarca,
  type Composicao,
  type ConteudoDaMoldura,
} from "@albora/core";
import type { FramePalette } from "@/lib/frame-palette";

type Ctx2d = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function desenharFoto(
  ctx: Ctx2d,
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
  ctx: Ctx2d,
  faixa: Composicao["faixa"],
  conteudo: ConteudoDaMoldura,
  paleta: FramePalette,
) {
  const cx = LARGURA_DA_COMPOSICAO / 2;
  let y = faixa.y + 72;

  ctx.fillStyle = paleta.superficie;
  ctx.fillRect(faixa.x, faixa.y, faixa.largura, faixa.altura);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = paleta.acento;
  ctx.font = `600 64px ${paleta.fonteTitulo}`;
  ctx.fillText(conteudo.monograma, cx, y);
  y += 56;

  ctx.fillStyle = paleta.ink;
  ctx.font = `400 36px ${paleta.fonteTitulo}`;
  ctx.fillText(conteudo.titulo, cx, y);
  y += 44;

  ctx.fillStyle = paleta.ink2;
  ctx.font = `400 26px ${paleta.fonteCorpo}`;
  ctx.fillText(conteudo.data, cx, y);
  y += 36;

  if (conteudo.credito) {
    ctx.fillText(conteudo.credito, cx, y);
    y += 32;
  }

  if (conteudo.legenda) {
    ctx.font = `400 22px ${paleta.fonteCorpo}`;
    const legenda =
      conteudo.legenda.length > 80 ? `${conteudo.legenda.slice(0, 77)}…` : conteudo.legenda;
    ctx.fillText(legenda, cx, y);
    y += 32;
  }

  ctx.font = `400 22px ${paleta.fonteCorpo}`;
  ctx.fillText(`albora.app/e/${conteudo.slug}`, cx, faixa.y + faixa.altura - 36);
}

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

function preencherCelula(
  foto: { largura: number; altura: number },
  celula: { x: number; y: number; largura: number; altura: number },
) {
  const fator = Math.max(celula.largura / foto.largura, celula.altura / foto.altura);
  const largura = foto.largura * fator;
  const altura = foto.altura * fator;
  return {
    x: celula.x + (celula.largura - largura) / 2,
    y: celula.y + (celula.altura - altura) / 2,
    largura,
    altura,
  };
}

/** Quinto renderizador: moldura 9:16 com tokens do evento (spec 015). */
export async function drawFrame(
  imagem: CanvasImageSource,
  composicao: Composicao,
  paleta: FramePalette,
): Promise<Blob> {
  const canvas = criarCanvas();
  const ctx = ctx2d(canvas);

  ctx.fillStyle = paleta.bg;
  ctx.fillRect(0, 0, LARGURA_DA_COMPOSICAO, ALTURA_DA_COMPOSICAO);

  desenharFoto(ctx, imagem, composicao);
  desenharFaixaConteudo(ctx, composicao.faixa, composicao.conteudo, paleta);

  return canvasParaBlob(canvas);
}

/** Colagem da noite — até quatro fotos do convidado (spec 015). */
export async function drawCollage(
  fotos: { img: CanvasImageSource; largura: number; altura: number }[],
  conteudo: ConteudoDaMoldura,
  paleta: FramePalette,
): Promise<Blob> {
  const canvas = criarCanvas();
  const ctx = ctx2d(canvas);

  ctx.fillStyle = paleta.bg;
  ctx.fillRect(0, 0, LARGURA_DA_COMPOSICAO, ALTURA_DA_COMPOSICAO);

  const celulas = celulasDaColagem(fotos.length);
  for (let i = 0; i < fotos.length; i += 1) {
    const foto = fotos[i]!;
    const celula = celulas[i]!;
    const caixa = preencherCelula(foto, celula);
    ctx.save();
    ctx.beginPath();
    ctx.rect(celula.x, celula.y, celula.largura, celula.altura);
    ctx.clip();
    ctx.drawImage(foto.img, caixa.x, caixa.y, caixa.largura, caixa.altura);
    ctx.restore();
  }

  desenharFaixaConteudo(ctx, faixaDaMarca(), conteudo, paleta);

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

export { shareOrDownload } from "@/lib/share-or-download";
