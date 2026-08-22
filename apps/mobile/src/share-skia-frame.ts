/**
 * Renderizador Skia da moldura 9:16 — quinto renderizador (spec 015 / architecture §6).
 *
 * Nunca importe este módulo de arquivos *.test.ts: o nativo não carrega em Node.
 * Nos testes injete `renderFrame` em `compartilharFotoPropria`.
 */
import {
  ClipOp,
  FilterMode,
  ImageFormat,
  MipmapMode,
  Skia,
  TileMode,
  matchFont,
  type SkCanvas,
  type SkFont,
  type SkImage,
  type SkPaint,
} from "@shopify/react-native-skia";
import {
  ALTURA_DA_COMPOSICAO,
  LARGURA_DA_COMPOSICAO,
  faixaDaMarca,
  type Composicao,
  type ConteudoDaMoldura,
} from "@albora/core";
import type { FramePalette } from "./share-frame-palette";
import { primeiraFamiliaFonte } from "./share-font-stack";

function paintHex(hex: string): SkPaint {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(hex));
  return paint;
}

function fontOf(size: number, stack: string, weight: "normal" | "bold" = "normal"): SkFont {
  return matchFont({
    fontFamily: primeiraFamiliaFonte(stack),
    fontSize: size,
    fontWeight: weight === "bold" ? "600" : "400",
    fontStyle: "normal",
  });
}

function drawCenteredText(
  canvas: SkCanvas,
  text: string,
  cx: number,
  y: number,
  font: SkFont,
  paint: SkPaint,
) {
  const bounds = font.measureText(text, paint);
  const x = cx - bounds.width / 2;
  canvas.drawText(text, x, y, paint, font);
}

function desenharFoto(canvas: SkCanvas, imagem: SkImage, composicao: Composicao) {
  const { area, foto, modelo } = composicao;
  const src = Skia.XYWHRect(0, 0, imagem.width(), imagem.height());

  if (modelo === "ambiente") {
    // Blur suave de fundo — ImageFilter se disponível; senão cobre com área.
    const blurPaint = Skia.Paint();
    try {
      const filter = Skia.ImageFilter.MakeBlur(16, 16, TileMode.Clamp, null);
      if (filter) blurPaint.setImageFilter(filter);
    } catch {
      // sem blur — ainda desenha o cover
    }
    canvas.drawImageRectOptions(
      imagem,
      src,
      Skia.XYWHRect(area.x, area.y, area.largura, area.altura),
      FilterMode.Linear,
      MipmapMode.None,
      blurPaint,
    );
  }

  canvas.save();
  canvas.clipRect(Skia.XYWHRect(area.x, area.y, area.largura, area.altura), ClipOp.Intersect, true);
  canvas.drawImageRectOptions(
    imagem,
    src,
    Skia.XYWHRect(foto.x, foto.y, foto.largura, foto.altura),
    FilterMode.Linear,
    MipmapMode.Linear,
  );
  canvas.restore();
}

function desenharFaixa(
  canvas: SkCanvas,
  faixa: Composicao["faixa"],
  conteudo: Composicao["conteudo"],
  paleta: FramePalette,
) {
  const cx = LARGURA_DA_COMPOSICAO / 2;
  let y = faixa.y + 72;

  canvas.drawRect(
    Skia.XYWHRect(faixa.x, faixa.y, faixa.largura, faixa.altura),
    paintHex(paleta.superficie),
  );

  drawCenteredText(canvas, conteudo.monograma, cx, y, fontOf(64, paleta.fonteTitulo, "bold"), paintHex(paleta.acento));
  y += 56;

  drawCenteredText(canvas, conteudo.titulo, cx, y, fontOf(36, paleta.fonteTitulo), paintHex(paleta.ink));
  y += 44;

  drawCenteredText(canvas, conteudo.data, cx, y, fontOf(26, paleta.fonteCorpo), paintHex(paleta.ink2));
  y += 36;

  if (conteudo.credito) {
    drawCenteredText(canvas, conteudo.credito, cx, y, fontOf(26, paleta.fonteCorpo), paintHex(paleta.ink2));
    y += 32;
  }

  if (conteudo.legenda) {
    const legenda =
      conteudo.legenda.length > 80 ? `${conteudo.legenda.slice(0, 77)}…` : conteudo.legenda;
    drawCenteredText(canvas, legenda, cx, y, fontOf(22, paleta.fonteCorpo), paintHex(paleta.ink2));
  }

  drawCenteredText(
    canvas,
    `albora.app/e/${conteudo.slug}`,
    cx,
    faixa.y + faixa.altura - 36,
    fontOf(22, paleta.fonteCorpo),
    paintHex(paleta.ink2),
  );
}

export async function renderShareFrame(opts: {
  bytes: Uint8Array;
  composicao: Composicao;
  paleta: FramePalette;
}): Promise<Uint8Array> {
  const data = Skia.Data.fromBytes(opts.bytes);
  const imagem = Skia.Image.MakeImageFromEncoded(data);
  if (!imagem) throw new Error("Skia: falha ao decodificar foto do share");

  const surface = Skia.Surface.Make(LARGURA_DA_COMPOSICAO, ALTURA_DA_COMPOSICAO);
  if (!surface) throw new Error("Skia: falha ao criar surface da moldura");

  const canvas = surface.getCanvas();
  canvas.drawRect(
    Skia.XYWHRect(0, 0, LARGURA_DA_COMPOSICAO, ALTURA_DA_COMPOSICAO),
    paintHex(opts.paleta.bg),
  );

  desenharFoto(canvas, imagem, opts.composicao);
  desenharFaixa(canvas, opts.composicao.faixa, opts.composicao.conteudo, opts.paleta);

  const snap = surface.makeImageSnapshot();
  const encoded = snap.encodeToBytes(ImageFormat.JPEG, 90);
  if (!encoded) throw new Error("Skia: falha ao codificar moldura");
  return encoded;
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

export async function renderShareCollage(opts: {
  fotos: Array<{ bytes: Uint8Array; largura: number; altura: number }>;
  conteudo: ConteudoDaMoldura;
  paleta: FramePalette;
  celulas: Array<{ x: number; y: number; largura: number; altura: number }>;
}): Promise<Uint8Array> {
  const surface = Skia.Surface.Make(LARGURA_DA_COMPOSICAO, ALTURA_DA_COMPOSICAO);
  if (!surface) throw new Error("Skia: falha ao criar surface da colagem");

  const canvas = surface.getCanvas();
  canvas.drawRect(
    Skia.XYWHRect(0, 0, LARGURA_DA_COMPOSICAO, ALTURA_DA_COMPOSICAO),
    paintHex(opts.paleta.bg),
  );

  for (let i = 0; i < opts.fotos.length; i += 1) {
    const foto = opts.fotos[i]!;
    const celula = opts.celulas[i]!;
    const data = Skia.Data.fromBytes(foto.bytes);
    const imagem = Skia.Image.MakeImageFromEncoded(data);
    if (!imagem) continue;
    const caixa = preencherCelula(foto, celula);
    canvas.save();
    canvas.clipRect(
      Skia.XYWHRect(celula.x, celula.y, celula.largura, celula.altura),
      ClipOp.Intersect,
      true,
    );
    canvas.drawImageRectOptions(
      imagem,
      Skia.XYWHRect(0, 0, imagem.width(), imagem.height()),
      Skia.XYWHRect(caixa.x, caixa.y, caixa.largura, caixa.altura),
      FilterMode.Linear,
      MipmapMode.Linear,
    );
    canvas.restore();
  }

  desenharFaixa(canvas, faixaDaMarca(), opts.conteudo, opts.paleta);

  const snap = surface.makeImageSnapshot();
  const encoded = snap.encodeToBytes(ImageFormat.JPEG, 90);
  if (!encoded) throw new Error("Skia: falha ao codificar colagem");
  return encoded;
}
