import type { Bitmap, Desenhista, FiltroAplicado } from "@albora/core";
import { lerOrientacao, thumbTarget, transformacaoParaOrientacao } from "@albora/core";
import { bufferDrawer } from "./drawer";

/** Gera uma miniatura com o filtro aplicado para exibição no step de revisão. Downsampla para ≤320 px no lado maior antes de filtrar — o custo de cor fica proporcional ao tamanho da tela, não do sensor (12 MP → ~320 px² é ~200× mais rápido que filtrar o original). Pura e testável sem React Native: só usa `bufferDrawer` (jpeg-js) e funções de `@albora/core`. Quem lê o arquivo e converte para data URI é o chamador (photo.tsx). @param bytes Bytes brutos do JPEG capturado pela câmera. @param mime MIME da entrada (normalmente "image/jpeg"). @param filtro Filtro a aplicar; `undefined` retorna o thumb sem cor. @param desenhista Implementação de decode/resize/filtro. Padrão: `bufferDrawer` (jpeg-js) — compatível com Node/testes. Em produção: `skiaDrawer`. @returns Bytes JPEG da miniatura filtrada. */
export async function previewFiltrado(
  bytes: Uint8Array,
  mime: string,
  filtro: FiltroAplicado | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TSaida=Uint8Array; TImagem é opaco dentro do pipeline
  desenhista?: Desenhista<any, Uint8Array>,
): Promise<Uint8Array> {
  const d = desenhista ?? (bufferDrawer as Desenhista<Bitmap, Uint8Array>);
  const orientacao = lerOrientacao(bytes);
  const { girar, espelhar, trocaEixos } = transformacaoParaOrientacao(orientacao);

  const imagem = await d.decodificar(bytes, mime);

  const larguraPe = trocaEixos ? imagem.altura : imagem.largura;
  const alturaPe = trocaEixos ? imagem.largura : imagem.altura;

  const target = thumbTarget(larguraPe, alturaPe);
  const reduzida = await d.desenhar(imagem, target, { girar, espelhar });

  const colorida = filtro && d.filtrar ? await d.filtrar(reduzida, filtro) : reduzida;

  return d.codificar(colorida, "image/jpeg", 0.7);
}

/** Converte bytes JPEG para data URI — helper de conveniência para o Image do RN. Processa em chunks de 8 KiB para não estourar a pilha de chamadas no String.fromCharCode de imagens maiores. */
export function bytesParaDataUri(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:image/jpeg;base64,${btoa(binary)}`;
}
