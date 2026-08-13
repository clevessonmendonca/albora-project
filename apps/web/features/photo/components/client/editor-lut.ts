import {
  aplicarAjustes,
  aplicarIntensidade,
  aplicarPorPixel,
  paraFiltroCss,
  saoNeutros,
  TETO_POR_PIXEL_MS,
  type AjustesManuais,
  type Preset,
} from "@albora/core";

export const LADO_PREVIA = 1000;
export const LADO_TIRA = 150;
export const SEM_FILTRO = "__sem";

/** Escala visível de luz, calor e contraste. O contrato é −1 a 1. */
export const PASSOS_BIPOLAR = 50;
/** Escala visível de vinheta e intensidade. O contrato é 0 a 1. */
export const PASSOS_UNIPOLAR = 100;

export type Escolha = { preset: Preset | null; intensidade: number };

export type CachePrevia = {
  comPreset: { chave: string; quadro: ImageData } | null;
  rascunho: ImageData | null;
};

export function criarCachePrevia(): CachePrevia {
  return { comPreset: null, rascunho: null };
}

export function resetarCachePrevia(cache: CachePrevia) {
  cache.comPreset = null;
  cache.rascunho = null;
}

/**
 * Uma miniatura por preset, gerada uma vez.
 *
 * Vai como blob e não como `filter` de CSS na tag porque o 35 mm não existe em
 * CSS — e uma tira onde sete chips mostram a verdade e um mostra outra coisa é
 * pior do que não ter tira.
 */
export async function miniatura(base: ImageBitmap, preset: Preset | null): Promise<string> {
  const tela = document.createElement("canvas");
  tela.width = base.width;
  tela.height = base.height;

  const ctx = tela.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";

  if (!preset) {
    ctx.drawImage(base, 0, 0);
  } else if (preset.porPixel) {
    ctx.drawImage(base, 0, 0);
    const quadro = ctx.getImageData(0, 0, base.width, base.height);
    aplicarPorPixel(quadro.data, base.width, base.height, 1);
    ctx.putImageData(quadro, 0, 0);
  } else {
    ctx.filter = paraFiltroCss(preset.ajustes);
    ctx.drawImage(base, 0, 0);
  }

  return await new Promise<string>((ok) =>
    tela.toBlob((b) => ok(b ? URL.createObjectURL(b) : ""), "image/jpeg", 0.7),
  );
}

export async function carregarImagemEditor(
  arquivo: File,
  presets: readonly Preset[],
): Promise<{ previa: ImageBitmap; tiras: Map<string, string>; urls: string[] }> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = LADO_PREVIA / Math.max(bitmap.width, bitmap.height);

  const previa = await createImageBitmap(bitmap, {
    resizeWidth: Math.round(bitmap.width * Math.min(1, escala)),
    resizeQuality: "high",
  });

  // Uma redução, oito usos. É a correção do que travou no protótipo.
  const escalaTira = LADO_TIRA / Math.max(bitmap.width, bitmap.height);
  const base = await createImageBitmap(bitmap, {
    resizeWidth: Math.max(1, Math.round(bitmap.width * escalaTira)),
    resizeQuality: "medium",
  });

  const urls: string[] = [];
  const tiras = new Map<string, string>();

  const semFiltro = await miniatura(base, null);
  urls.push(semFiltro);
  tiras.set(SEM_FILTRO, semFiltro);

  for (const p of presets) {
    const url = await miniatura(base, p);
    urls.push(url);
    tiras.set(p.id, url);
  }

  return { previa, tiras, urls };
}

type ParametrosPrevia = {
  tela: HTMLCanvasElement;
  previa: ImageBitmap;
  escolhido: Preset | null;
  intensidade: number;
  degradar: boolean;
  ajustes: AjustesManuais;
  cache: CachePrevia;
  onDegradar: () => void;
};

export function desenharPreviaNoCanvas({
  tela,
  previa,
  escolhido,
  intensidade,
  degradar,
  ajustes,
  cache,
  onDegradar,
}: ParametrosPrevia) {
  if (tela.width !== previa.width || tela.height !== previa.height) {
    tela.width = previa.width;
    tela.height = previa.height;
    resetarCachePrevia(cache);
  }

  const ctx = tela.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  const porPixel = !!escolhido?.porPixel && !degradar;
  const chave = `${escolhido?.id ?? SEM_FILTRO}|${porPixel}|${intensidade}`;
  const guardado = cache.comPreset;

  let fonte: ImageData;

  // O resultado do preset fica guardado porque arrastar Vinheta não muda o
  // preset: sem isto, cada quadro refaria também a passagem por pixel do
  // 35 mm, que é uma varredura inteira da imagem por nada.
  if (guardado && guardado.chave === chave) {
    fonte = guardado.quadro;
  } else {
    ctx.filter =
      escolhido && !porPixel
        ? paraFiltroCss(aplicarIntensidade(escolhido.ajustes, intensidade))
        : "none";
    ctx.drawImage(previa, 0, 0);
    ctx.filter = "none";

    fonte = ctx.getImageData(0, 0, previa.width, previa.height);

    if (porPixel) {
      const antes = performance.now();
      aplicarPorPixel(fonte.data, previa.width, previa.height, intensidade);
      const gasto = performance.now() - antes;

      // A medida é do trabalho de verdade, não de uma sonda à parte. Se a
      // projeção para o tamanho cheio passa do teto, o preset cai para a
      // aproximação em CSS e a foto sai parecida em vez de sair tarde.
      const projecao = (gasto * 2500 * 1875) / (previa.width * previa.height);
      if (projecao > TETO_POR_PIXEL_MS) onDegradar();
    }

    cache.comPreset = { chave, quadro: fonte };
  }

  if (saoNeutros(ajustes)) {
    ctx.putImageData(fonte, 0, 0);
    return;
  }

  let sobre = cache.rascunho;
  if (!sobre || sobre.width !== fonte.width || sobre.height !== fonte.height) {
    sobre = new ImageData(fonte.width, fonte.height);
    cache.rascunho = sobre;
  }

  sobre.data.set(fonte.data);
  aplicarAjustes(sobre.data, fonte.width, fonte.height, ajustes);
  ctx.putImageData(sobre, 0, 0);
}
