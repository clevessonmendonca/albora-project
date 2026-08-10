import {
  lerOrientacao,
  temGeolocalizacao,
  transformacaoParaOrientacao,
  type Orientacao,
} from "./exif";
import { planejarProcessamento, QUALIDADE, type Alvo, type Aparelho, type Plano } from "./redimensionar";

/**
 * A orquestração do processamento de foto, sem tocar em canvas.
 *
 * O desenho fica atrás de `Desenhista`, que cada superfície implementa — web
 * com `OffscreenCanvas`, Expo com a sua. Assim a **ordem** das operações, que
 * é onde moram os bugs, é testável sem navegador; e o que sobra do outro lado
 * é código curto o bastante para caber na cabeça.
 */

export type Bitmap = { largura: number; altura: number };

export type Desenhista<TImagem extends Bitmap, TSaida> = {
  decodificar(bytes: Uint8Array, mime: string): Promise<TImagem>;
  /**
   * Desenha aplicando giro e espelho, e devolve a imagem no tamanho pedido.
   * Recebe a transformação pronta — não lê EXIF, não decide nada.
   */
  desenhar(
    imagem: TImagem,
    alvo: Alvo,
    transformacao: { girar: 0 | 90 | 180 | 270; espelhar: boolean },
  ): Promise<TImagem>;
  codificar(imagem: TImagem, mime: string, qualidade: number): Promise<TSaida>;
};

export type FotoProcessada<TSaida> = {
  full: TSaida;
  thumb: TSaida;
  largura: number;
  altura: number;
  orientacaoOriginal: Orientacao;
  /** Verificação, não decisão: o EXIF sai sempre, tenha GPS ou não. */
  tinhaGeolocalizacao: boolean;
};

export type OpcoesProcessamento = {
  plano: Plano;
  aparelho: Aparelho;
  /** Saída sempre em JPEG: é o que o iPhone não entrega e todo mundo abre. */
  mimeSaida?: string;
};

/**
 * Prepara a foto para subir: orientação corrigida, tamanho reduzido, EXIF
 * fora, miniatura junto.
 *
 * A ordem é a regra inteira desta função:
 *
 * 1. **Ler a orientação antes de qualquer coisa.** Reencodar apaga o EXIF de
 *    graça, inclusive a tag — depois dela não há de onde recuperar, e a foto
 *    do iPhone entra deitada no álbum.
 * 2. **Aplicar a orientação nos pixels**, para que a imagem sem EXIF já
 *    esteja em pé.
 * 3. **Reencodar**, que é o que de fato remove o EXIF e o GPS junto.
 * 4. **Miniatura a partir do resultado**, não do original: reprocessar o
 *    original dobraria o pico de memória no aparelho mais fraco.
 */
export async function processarFoto<TImagem extends Bitmap, TSaida>(
  bytes: Uint8Array,
  mimeEntrada: string,
  desenhista: Desenhista<TImagem, TSaida>,
  opcoes: OpcoesProcessamento,
): Promise<FotoProcessada<TSaida>> {
  const mimeSaida = opcoes.mimeSaida ?? "image/jpeg";

  const orientacaoOriginal = lerOrientacao(bytes);
  const { girar, espelhar, trocaEixos } = transformacaoParaOrientacao(orientacaoOriginal);

  const original = await desenhista.decodificar(bytes, mimeEntrada);

  // As dimensões do plano são as da imagem **já em pé**. Planejar sobre as
  // dimensões cruas encolheria pelo lado errado numa foto de retrato.
  const largura = trocaEixos ? original.altura : original.largura;
  const altura = trocaEixos ? original.largura : original.altura;

  const plano = planejarProcessamento({
    largura,
    altura,
    plano: opcoes.plano,
    aparelho: opcoes.aparelho,
  });

  const emPe = await desenhista.desenhar(original, plano.full, { girar, espelhar });
  const full = await desenhista.codificar(emPe, mimeSaida, QUALIDADE.full);

  const reduzida = await desenhista.desenhar(emPe, plano.thumb, { girar: 0, espelhar: false });
  const thumb = await desenhista.codificar(reduzida, mimeSaida, QUALIDADE.thumb);

  return {
    full,
    thumb,
    largura: plano.full.largura,
    altura: plano.full.altura,
    orientacaoOriginal,
    tinhaGeolocalizacao: temGeolocalizacao(bytes),
  };
}
