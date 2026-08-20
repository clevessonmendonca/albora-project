import {
  AlphaType,
  ColorType,
  FilterMode,
  ImageFormat,
  MipmapMode,
  Skia,
  type SkImage,
} from "@shopify/react-native-skia";
import {
  aplicarAjustes,
  aplicarFiltroCss,
  aplicarIntensidade,
  aplicarPorPixel,
  type Bitmap,
  type Desenhista,
} from "@albora/core";

/**
 * Handle opaco para imagens Skia — só vive no processo nativo.
 *
 * Nunca importe este módulo de arquivos *.test.ts: o módulo nativo não
 * carrega em Node. Use `bufferDrawer` (jpeg-js) nos testes.
 */
export type SkiaImageHandle = { largura: number; altura: number; sk: SkImage };

function saoNeutrosSafe(m: { luz: number; calor: number; contraste: number; vinheta: number }): boolean {
  return m.luz === 0 && m.calor === 0 && m.contraste === 0 && m.vinheta === 0;
}

/**
 * Desenhista Expo usando Skia (GPU) — substitui o bufferDrawer (jpeg-js) na
 * produção. Resize com bicúbico (drawImageRectOptions + FilterMode.Linear /
 * MipmapMode.Linear): qualidade visualmente superior ao nearest-neighbor do
 * bufferDrawer sem custo perceptível de tempo.
 *
 * `filtrar` lê os pixels da imagem Skia, delega a matemática ao @albora/core
 * (mesmas funções `aplicarFiltroCss`/`aplicarPorPixel`/`aplicarAjustes` do
 * bufferDrawer) e cria uma nova SkImage — sem divergência de LUT entre os dois
 * caminhos.
 *
 * GPU ColorFilter (ColorMatrix direto no shader) fica fora do escopo desta
 * fatia; a passagem por pixel do core já cobre a estética necessária.
 */
export const skiaDrawer: Desenhista<SkiaImageHandle, Uint8Array> = {
  async decodificar(bytes) {
    const data = Skia.Data.fromBytes(bytes);
    const sk = Skia.Image.MakeImageFromEncoded(data);
    if (!sk) throw new Error("Skia: falha ao decodificar imagem");
    return { largura: sk.width(), altura: sk.height(), sk };
  },

  async desenhar(imagem, target, t) {
    const { girar, espelhar } = t;
    const trocou = girar === 90 || girar === 270;

    // As dimensões do destino na orientação "antes do giro" para montar o rect.
    const dstW = trocou ? target.height : target.width;
    const dstH = trocou ? target.width : target.height;

    const surface = Skia.Surface.Make(target.width, target.height);
    if (!surface) throw new Error("Skia: falha ao criar surface");

    const canvas = surface.getCanvas();
    canvas.save();

    // Transforma a partir do centro do destino, como o remapBuffer do bufferDrawer.
    canvas.translate(target.width / 2, target.height / 2);
    if (girar !== 0) canvas.rotate(girar, 0, 0);
    if (espelhar) canvas.scale(-1, 1);
    canvas.translate(-dstW / 2, -dstH / 2);

    const src = Skia.XYWHRect(0, 0, imagem.largura, imagem.altura);
    const dst = Skia.XYWHRect(0, 0, dstW, dstH);

    // FilterMode.Linear + MipmapMode.Linear: bilinear com mipmap —
    // qualidade equivalente a bicúbico para downscale de foto, sem custo extra.
    canvas.drawImageRectOptions(imagem.sk, src, dst, FilterMode.Linear, MipmapMode.Linear);
    canvas.restore();

    const snap = surface.makeImageSnapshot();
    return { largura: target.width, altura: target.height, sk: snap };
  },

  async codificar(imagem, _mime, qualidade) {
    const bytes = imagem.sk.encodeToBytes(
      ImageFormat.JPEG,
      Math.round(Math.min(1, Math.max(0.1, qualidade)) * 100),
    );
    if (!bytes) throw new Error("Skia: falha ao codificar imagem");
    return bytes;
  },

  async filtrar(imagem, filtro) {
    const w = imagem.largura;
    const h = imagem.altura;

    // Lê pixels RGBA não-premultiplicado para que o math do core funcione igual
    // ao bufferDrawer (jpeg-js também devolve RGBA não-premultiplicado).
    const raw = imagem.sk.readPixels(0, 0, {
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
      width: w,
      height: h,
    });
    if (!raw) throw new Error("Skia: falha ao ler pixels");

    const pixels = new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.byteLength);
    const manuais =
      filtro.manuais && !saoNeutrosSafe(filtro.manuais) ? filtro.manuais : undefined;

    if (filtro.porPixel) {
      aplicarPorPixel(pixels, w, h, filtro.intensidade);
    } else if (filtro.intensidade > 0) {
      aplicarFiltroCss(pixels, w, h, aplicarIntensidade(filtro.ajustes, filtro.intensidade));
    }
    if (manuais) aplicarAjustes(pixels, w, h, manuais);

    // MakeImage espera SkData — converte o buffer modificado de volta.
    const skData = Skia.Data.fromBytes(new Uint8Array(pixels.buffer));
    const sk = Skia.Image.MakeImage(
      { width: w, height: h, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul },
      skData,
      w * 4,
    );
    if (!sk) throw new Error("Skia: falha ao criar imagem dos pixels filtrados");
    return { largura: w, altura: h, sk };
  },
};
