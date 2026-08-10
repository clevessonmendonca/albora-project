import type { Alvo, Bitmap, Desenhista } from "@albora/core";

/**
 * O `Desenhista` da web. Camada fina de propósito.
 *
 * Toda decisão — qual orientação aplicar, qual tamanho, em que ordem — já foi
 * tomada e testada em `@albora/core`. Aqui só se desenha. É o que permite ao
 * app Expo ter o seu equivalente sem reabrir nenhuma daquelas decisões.
 *
 * ⚠️ Esta é a única parte do pipeline que não tem teste automatizado: pixel
 * só se verifica com olho em aparelho. A prova está no runbook da task 004.
 */

type Img = Bitmap & { bitmap: ImageBitmap };

function contexto(largura: number, altura: number) {
  // `OffscreenCanvas` mantém o trabalho fora da thread da interface: num
  // aparelho modesto, redimensionar 12 MP na main thread congela a tela e o
  // convidado acha que travou.
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(largura, altura)
      : Object.assign(document.createElement("canvas"), { width: largura, height: altura });

  const ctx = (canvas as OffscreenCanvas).getContext("2d");
  if (!ctx) throw new ErroCanvasIndisponivel();

  // O padrão do canvas é interpolação rápida, que serrilha ao reduzir muito.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  return { canvas: canvas as OffscreenCanvas, ctx };
}

export const desenhistaWeb: Desenhista<Img, Blob> = {
  async decodificar(bytes, mime) {
    const bitmap = await createImageBitmap(new Blob([bytes as BufferSource], { type: mime }));
    return { largura: bitmap.width, altura: bitmap.height, bitmap };
  },

  async desenhar(imagem, alvo: Alvo, t) {
    const { canvas, ctx } = contexto(alvo.largura, alvo.altura);

    ctx.save();
    // Gira em torno do centro do destino; com troca de eixos, o destino já
    // veio com largura e altura invertidas de `planejarProcessamento`.
    ctx.translate(alvo.largura / 2, alvo.altura / 2);
    if (t.girar) ctx.rotate((t.girar * Math.PI) / 180);
    if (t.espelhar) ctx.scale(-1, 1);

    const trocou = t.girar === 90 || t.girar === 270;
    const larguraDesenho = trocou ? alvo.altura : alvo.largura;
    const alturaDesenho = trocou ? alvo.largura : alvo.altura;

    ctx.drawImage(
      imagem.bitmap,
      -larguraDesenho / 2,
      -alturaDesenho / 2,
      larguraDesenho,
      alturaDesenho,
    );
    ctx.restore();

    const bitmap = canvas.transferToImageBitmap
      ? canvas.transferToImageBitmap()
      : await createImageBitmap(canvas as unknown as ImageBitmapSource);

    return { largura: alvo.largura, altura: alvo.altura, bitmap };
  },

  async codificar(imagem, mime, qualidade) {
    const { canvas, ctx } = contexto(imagem.largura, imagem.altura);
    ctx.drawImage(imagem.bitmap, 0, 0);

    // `convertToBlob` reencoda do zero — e é exatamente isso que remove o
    // EXIF, e o GPS junto. A remoção não é uma etapa separada que alguém pode
    // esquecer de chamar: ela é consequência de existir uma saída.
    return canvas.convertToBlob({ type: mime, quality: qualidade });
  },
};

export class ErroCanvasIndisponivel extends Error {
  readonly code = "canvas.indisponivel";
  constructor() {
    super("canvas 2D indisponível neste navegador");
  }
}
