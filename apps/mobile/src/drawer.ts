import {
  aplicarAjustes,
  aplicarFiltroCss,
  aplicarIntensidade,
  aplicarPorPixel,
  type Bitmap,
  type Desenhista,
  type Target,
} from "@albora/core";
import { decode as jpegDecode, encode as jpegEncode } from "jpeg-js";

/**
 * Desenhista Expo em buffer (jpeg-js) — mesma ordem de `processarFoto` que a web.
 *
 * Reencode remove EXIF/GPS. `filtrar` aplica passagem por pixel (35 mm),
 * presets CSS via `aplicarFiltroCss`, e ajustes manuais.
 */

export type BufferImage = Bitmap & { pixels: Uint8ClampedArray };

function sampleNearest(
  src: Uint8ClampedArray,
  sw: number,
  sh: number,
  sx: number,
  sy: number,
): [number, number, number, number] {
  const x = Math.min(sw - 1, Math.max(0, Math.round(sx)));
  const y = Math.min(sh - 1, Math.max(0, Math.round(sy)));
  const i = (y * sw + x) * 4;
  return [src[i]!, src[i + 1]!, src[i + 2]!, src[i + 3]!];
}

/**
 * Redimensiona + aplica giro/espelho num único passe (origem → destino).
 * nearest-neighbor: suficiente para testes em Node; `skiaDrawer` usa bicúbico em produção.
 */
export function remapBuffer(
  src: Uint8ClampedArray,
  sw: number,
  sh: number,
  target: Target,
  t: { girar: 0 | 90 | 180 | 270; espelhar: boolean },
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(target.width * target.height * 4);
  const trocou = t.girar === 90 || t.girar === 270;
  const dw = trocou ? target.height : target.width;
  const dh = trocou ? target.width : target.height;

  for (let y = 0; y < target.height; y += 1) {
    for (let x = 0; x < target.width; x += 1) {
      let lx = x - target.width / 2;
      let ly = y - target.height / 2;

      if (t.girar === 90) {
        const nx = ly;
        const ny = -lx;
        lx = nx;
        ly = ny;
      } else if (t.girar === 180) {
        lx = -lx;
        ly = -ly;
      } else if (t.girar === 270) {
        const nx = -ly;
        const ny = lx;
        lx = nx;
        ly = ny;
      }
      if (t.espelhar) lx = -lx;

      const sx = (lx + dw / 2) * (sw / dw);
      const sy = (ly + dh / 2) * (sh / dh);
      const [r, g, b, a] = sampleNearest(src, sw, sh, sx, sy);
      const o = (y * target.width + x) * 4;
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = a;
    }
  }
  return out;
}

export const bufferDrawer: Desenhista<BufferImage, Uint8Array> = {
  async decodificar(bytes) {
    const decoded = jpegDecode(bytes, { useTArray: true, formatAsRGBA: true });
    return {
      largura: decoded.width,
      altura: decoded.height,
      pixels: new Uint8ClampedArray(decoded.data),
    };
  },

  async desenhar(imagem, target, t) {
    const pixels = remapBuffer(imagem.pixels, imagem.largura, imagem.altura, target, t);
    return { largura: target.width, altura: target.height, pixels };
  },

  async codificar(imagem, _mime, qualidade) {
    const encoded = jpegEncode(
      { data: imagem.pixels, width: imagem.largura, height: imagem.altura },
      Math.round(Math.min(1, Math.max(0.1, qualidade)) * 100),
    );
    return new Uint8Array(encoded.data);
  },

  async filtrar(imagem, filtro) {
    const pixels = new Uint8ClampedArray(imagem.pixels);
    const manuais = filtro.manuais && !saoNeutrosSafe(filtro.manuais) ? filtro.manuais : undefined;

    if (filtro.porPixel) {
      aplicarPorPixel(pixels, imagem.largura, imagem.altura, filtro.intensidade);
    } else if (filtro.intensidade > 0) {
      aplicarFiltroCss(
        pixels,
        imagem.largura,
        imagem.altura,
        aplicarIntensidade(filtro.ajustes, filtro.intensidade),
      );
    }
    if (manuais) aplicarAjustes(pixels, imagem.largura, imagem.altura, manuais);

    return { largura: imagem.largura, altura: imagem.altura, pixels };
  },
};

function saoNeutrosSafe(m: { luz: number; calor: number; contraste: number; vinheta: number }): boolean {
  return m.luz === 0 && m.calor === 0 && m.contraste === 0 && m.vinheta === 0;
}
