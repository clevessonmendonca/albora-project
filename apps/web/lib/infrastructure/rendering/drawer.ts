import {
  aplicarAjustes,
  aplicarIntensidade,
  aplicarPorPixel,
  paraFiltroCss,
  saoNeutros,
  type Target,
  type Bitmap,
  type Desenhista,
} from "@albora/core";
import { desenharTextoNoContexto, estiloTextoDoStory } from "@/lib/domain/story/story-text";

/** `Desenhista` da web: camada fina — toda decisão já tomada em `@albora/core`; aqui só se desenha. ⚠️ Sem teste automatizado — pixel só se verifica com olho em aparelho (runbook task 004). */

type Img = Bitmap & { bitmap: ImageBitmap };

function contexto(largura: number, altura: number) {
  // `OffscreenCanvas` tira o trabalho da thread da interface — redimensionar 12MP na main thread congela a tela num aparelho modesto e o convidado acha que travou.
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(largura, altura)
      : Object.assign(document.createElement("canvas"), { width: largura, height: altura });

  const ctx = (canvas as OffscreenCanvas).getContext("2d");
  if (!ctx) throw new CanvasUnavailableError();

  // O padrão do canvas é interpolação rápida, que serrilha ao reduzir muito.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  return { canvas: canvas as OffscreenCanvas, ctx };
}

/** `transferToImageBitmap` só existe no `OffscreenCanvas` — Safari antigo cai para `<canvas>` de elemento, usa o caminho assíncrono. */
function paraBitmap(canvas: OffscreenCanvas): Promise<ImageBitmap> {
  return canvas.transferToImageBitmap
    ? Promise.resolve(canvas.transferToImageBitmap())
    : createImageBitmap(canvas as unknown as ImageBitmapSource);
}

export const webDrawer: Desenhista<Img, Blob> = {
  async decodificar(bytes, mime) {
    const bitmap = await createImageBitmap(new Blob([bytes as BufferSource], { type: mime }));
    return { largura: bitmap.width, altura: bitmap.height, bitmap };
  },

  async desenhar(imagem, target: Target, t) {
    const { canvas, ctx } = contexto(target.width, target.height);

    ctx.save();
    // Gira em torno do centro do destino; com troca de eixos, o destino já
    // veio com largura e altura invertidas de `planProcessing`.
    ctx.translate(target.width / 2, target.height / 2);
    if (t.girar) ctx.rotate((t.girar * Math.PI) / 180);
    if (t.espelhar) ctx.scale(-1, 1);

    const trocou = t.girar === 90 || t.girar === 270;
    const larguraDesenho = trocou ? target.height : target.width;
    const alturaDesenho = trocou ? target.width : target.height;

    ctx.drawImage(
      imagem.bitmap,
      -larguraDesenho / 2,
      -alturaDesenho / 2,
      larguraDesenho,
      alturaDesenho,
    );
    ctx.restore();

    return { largura: target.width, altura: target.height, bitmap: await paraBitmap(canvas) };
  },

  async codificar(imagem, mime, qualidade) {
    const { canvas, ctx } = contexto(imagem.largura, imagem.altura);
    ctx.drawImage(imagem.bitmap, 0, 0);

    // `convertToBlob` reencoda do zero, o que remove EXIF (e GPS junto) — a remoção não é etapa separada que alguém pode esquecer, é consequência de existir a saída.
    return canvas.convertToBlob({ type: mime, quality: qualidade });
  },

  async filtrar(imagem, filtro) {
    const { canvas, ctx } = contexto(imagem.largura, imagem.altura);

    const manuais = filtro.manuais && !saoNeutros(filtro.manuais) ? filtro.manuais : undefined;

    if (!filtro.porPixel) {
      ctx.filter = paraFiltroCss(aplicarIntensidade(filtro.ajustes, filtro.intensidade));
    }
    ctx.drawImage(imagem.bitmap, 0, 0);

    // Preset e ajustes dividem um único `getImageData`/`putImageData` — duas varreduras da imagem num Android de entrada é o que faz o convidado achar que travou.
    if (filtro.porPixel || manuais) {
      const quadro = ctx.getImageData(0, 0, imagem.largura, imagem.altura);

      if (filtro.porPixel) {
        aplicarPorPixel(quadro.data, imagem.largura, imagem.altura, filtro.intensidade);
      }
      if (manuais) aplicarAjustes(quadro.data, imagem.largura, imagem.altura, manuais);

      ctx.putImageData(quadro, 0, 0);
    }

    return { largura: imagem.largura, altura: imagem.altura, bitmap: await paraBitmap(canvas) };
  },

  async compor(imagem, texto) {
    const { canvas, ctx } = contexto(imagem.largura, imagem.altura);
    ctx.drawImage(imagem.bitmap, 0, 0);
    desenharTextoNoContexto(ctx, imagem.largura, imagem.altura, texto, estiloTextoDoStory());

    return { largura: imagem.largura, altura: imagem.altura, bitmap: await paraBitmap(canvas) };
  },
};

export class CanvasUnavailableError extends Error {
  readonly code = "canvas.indisponivel";
  constructor() {
    super("canvas 2D indisponível neste navegador");
  }
}
