import { saoNeutros, type AjustesManuais } from "./ajustes";
import type { Ajustes } from "./luts";
import {
  lerCapturadaEm,
  lerOrientacao,
  temGeolocalizacao,
  transformacaoParaOrientacao,
  type Orientacao,
} from "./exif";
import {
  planProcessing,
  QUALITY,
  type Device,
  type Plan,
  type Rede,
  type Target,
} from "./redimensionar";

export type Bitmap = { largura: number; altura: number };

export type Desenhista<TImagem extends Bitmap, TSaida> = {
  decodificar(bytes: Uint8Array, mime: string): Promise<TImagem>;
  /** Recebe a transformação pronta — não lê EXIF, não decide nada. */
  desenhar(
    imagem: TImagem,
    target: Target,
    transformacao: { girar: 0 | 90 | 180 | 270; espelhar: boolean },
  ): Promise<TImagem>;
  codificar(imagem: TImagem, mime: string, qualidade: number): Promise<TSaida>;
  /** Recebe a decisão pronta — não escolhe preset. Ausente, o filtro simplesmente não aplica. */
  filtrar?(imagem: TImagem, filtro: FiltroAplicado): Promise<TImagem>;
  /** Ausente, o texto simplesmente não sai — mesma regra de `filtrar`. */
  compor?(imagem: TImagem, texto: TextoComposto): Promise<TImagem>;
};

/** Posição e tamanho são fração 0–1 da imagem final — valem para prévia e para upload sem recálculo. */
export type TextoComposto = {
  /** Aparado; vazio equivale a não ter texto — o composer não desenha nada. */
  conteudo: string;
  /** Centro horizontal do texto, fração 0–1 da largura da imagem final. */
  x: number;
  /** Centro vertical do texto, fração 0–1 da altura da imagem final. */
  y: number;
  /** Tamanho da fonte, fração 0–1 da largura da imagem final. */
  tamanho: number;
};

export type FiltroAplicado = {
  ajustes: Ajustes;
  /** `true` usa passagem por pixel e ignora `ajustes` — assim o 35 mm degrada para CSS sem segundo preset. */
  porPixel: boolean;
  intensidade: number;
  /** Aplicados DEPOIS do preset; ausente ou neutro não custa passagem nenhuma. */
  manuais?: AjustesManuais | undefined;
};

function precisaDeCor(filtro: FiltroAplicado): boolean {
  return filtro.intensidade > 0 || (filtro.manuais !== undefined && !saoNeutros(filtro.manuais));
}

function precisaDeTexto(texto: TextoComposto): boolean {
  return texto.conteudo.trim() !== "";
}

export type FotoProcessada<TSaida> = {
  full: TSaida;
  thumb: TSaida;
  largura: number;
  altura: number;
  orientacaoOriginal: Orientacao;
  /** Verificação, não decisão: o EXIF sai sempre, tenha GPS ou não. */
  tinhaGeolocalizacao: boolean;
  /** Hora de parede do EXIF, sem fuso — quem persiste aplica o offset do evento. */
  capturadaEm: Date | null;
};

export type OpcoesProcessamento = {
  plan: Plan;
  device: Device;
  /** Ausente = não reduz por rede. Navegador sem Network Information API cai aqui. */
  rede?: Rede | undefined;
  mimeSaida?: string;
  /** Ausente = sem filtro. O preset é escolha do convidado, nunca padrão. */
  filtro?: FiltroAplicado;
  /** Ausente = sem texto. O composer é escolha do convidado, nunca padrão. */
  texto?: TextoComposto;
};

/** Ordem importa: orientação lida ANTES do reencode (que apaga EXIF), miniatura do resultado (não do original). */
export async function processarFoto<TImagem extends Bitmap, TSaida>(
  bytes: Uint8Array,
  mimeEntrada: string,
  desenhista: Desenhista<TImagem, TSaida>,
  opcoes: OpcoesProcessamento,
): Promise<FotoProcessada<TSaida>> {
  const mimeSaida = opcoes.mimeSaida ?? "image/jpeg";

  const orientacaoOriginal = lerOrientacao(bytes);
  const capturadaEm = lerCapturadaEm(bytes);
  const { girar, espelhar, trocaEixos } = transformacaoParaOrientacao(orientacaoOriginal);

  const original = await desenhista.decodificar(bytes, mimeEntrada);

  // Dimensões já em pé: planejar sobre dimensões cruas encolheria pelo lado errado em retrato.
  const largura = trocaEixos ? original.altura : original.largura;
  const altura = trocaEixos ? original.largura : original.altura;

  const planned = planProcessing({
    width: largura,
    height: altura,
    plan: opcoes.plan,
    device: opcoes.device,
    rede: opcoes.rede,
  });

  const emPe = await desenhista.desenhar(original, planned.full, { girar, espelhar });

  // Cor depois do redimensionamento; miniatura vem da colorida — full e thumb ficam com a mesma cor.
  const colorida =
    opcoes.filtro && desenhista.filtrar && precisaDeCor(opcoes.filtro)
      ? await desenhista.filtrar(emPe, opcoes.filtro)
      : emPe;

  // Texto depois da cor e antes da miniatura — `desenhar` queima os pixels, thumb herda sem recálculo.
  const composta =
    opcoes.texto && desenhista.compor && precisaDeTexto(opcoes.texto)
      ? await desenhista.compor(colorida, opcoes.texto)
      : colorida;

  const full = await desenhista.codificar(composta, mimeSaida, QUALITY.full);

  const reduzida = await desenhista.desenhar(composta, planned.thumb, { girar: 0, espelhar: false });
  const thumb = await desenhista.codificar(reduzida, mimeSaida, QUALITY.thumb);

  return {
    full,
    thumb,
    largura: planned.full.width,
    altura: planned.full.height,
    orientacaoOriginal,
    tinhaGeolocalizacao: temGeolocalizacao(bytes),
    capturadaEm,
  };
}
