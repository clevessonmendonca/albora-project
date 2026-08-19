import { saoNeutros, type AjustesManuais } from "./ajustes";
import type { Ajustes } from "./luts";
import {
  lerCapturadaEm,
  lerOrientacao,
  temGeolocalizacao,
  transformacaoParaOrientacao,
  type Orientacao,
} from "./exif";
import { planProcessing, QUALITY, type Device, type Plan, type Target } from "./redimensionar";

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
    target: Target,
    transformacao: { girar: 0 | 90 | 180 | 270; espelhar: boolean },
  ): Promise<TImagem>;
  codificar(imagem: TImagem, mime: string, qualidade: number): Promise<TSaida>;
  /**
   * Aplica cor. Recebe a decisão pronta — não escolhe preset nem decide
   * degradar. Ausente, o preset simplesmente não sai do preview.
   */
  filtrar?(imagem: TImagem, filtro: FiltroAplicado): Promise<TImagem>;
  /**
   * Compõe o texto do composer sobre a imagem, depois da cor (spec 020,
   * sub-etapa a). Ausente, o texto simplesmente não sai — mesma regra de
   * `filtrar`.
   */
  compor?(imagem: TImagem, texto: TextoComposto): Promise<TImagem>;
};

/**
 * O texto que o convidado escreve sobre a foto no composer, estilo story.
 *
 * Posição e tamanho são fração da imagem final (0–1), não pixel — o mesmo
 * texto vale para a prévia de 1000 px e para a foto em tamanho de subida sem
 * recálculo, porque `desenhar` já redesenha tudo dentro de um `Target`
 * proporcional.
 */
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
  /**
   * `false` manda usar `ajustes` como filtro de cor. `true` manda usar a
   * passagem por pixel, e aí `ajustes` é ignorado — é assim que o 35 mm
   * degrada para CSS sem precisar de um segundo preset.
   */
  porPixel: boolean;
  intensidade: number;
  /**
   * Os quatro ajustes manuais, aplicados DEPOIS do preset. Ausente ou neutro
   * não custa passagem nenhuma — o caso comum é escolher filtro e enviar.
   */
  manuais?: AjustesManuais | undefined;
};

/**
 * Se a passagem de cor mudaria algum pixel.
 *
 * Intensidade 0 é o neutro por definição dos dois caminhos — `aplicarIntensidade`
 * devolve `NEUTRO` e `aplicarPorPixel` sai na entrada. Sem esta porta, escolher
 * um preset e voltar atrás custaria um `getImageData` da imagem inteira no
 * aparelho mais fraco, para devolver os mesmos bytes.
 */
function precisaDeCor(filtro: FiltroAplicado): boolean {
  return filtro.intensidade > 0 || (filtro.manuais !== undefined && !saoNeutros(filtro.manuais));
}

/** Texto em branco (ou só espaço) equivale a não ter composer aberto. */
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
  /**
   * Parede do EXIF, sem fuso. Ausente quando a foto não traz DateTime.
   * Quem persiste aplica o offset do evento via `instanteDaParede`.
   */
  capturadaEm: Date | null;
};

export type OpcoesProcessamento = {
  plan: Plan;
  device: Device;
  /** Saída sempre em JPEG: é o que o iPhone não entrega e todo mundo abre. */
  mimeSaida?: string;
  /** Ausente = sem filtro. O preset é escolha do convidado, nunca padrão. */
  filtro?: FiltroAplicado;
  /** Ausente = sem texto. O composer é escolha do convidado, nunca padrão. */
  texto?: TextoComposto;
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
  const capturadaEm = lerCapturadaEm(bytes);
  const { girar, espelhar, trocaEixos } = transformacaoParaOrientacao(orientacaoOriginal);

  const original = await desenhista.decodificar(bytes, mimeEntrada);

  // As dimensões do plano são as da imagem **já em pé**. Planejar sobre as
  // dimensões cruas encolheria pelo lado errado numa foto de retrato.
  const largura = trocaEixos ? original.altura : original.largura;
  const altura = trocaEixos ? original.largura : original.altura;

  const planned = planProcessing({
    width: largura,
    height: altura,
    plan: opcoes.plan,
    device: opcoes.device,
  });

  const emPe = await desenhista.desenhar(original, planned.full, { girar, espelhar });

  // A cor entra depois de a foto estar em pé e no tamanho final, e a miniatura
  // sai DELA. Preset e ajustes manuais vão na mesma chamada — separá-los daria
  // duas varreduras da imagem, e filtrar full e thumb em separado deixaria a
  // tira do telão com uma cor e a foto do álbum com outra.
  const colorida =
    opcoes.filtro && desenhista.filtrar && precisaDeCor(opcoes.filtro)
      ? await desenhista.filtrar(emPe, opcoes.filtro)
      : emPe;

  // O texto do composer entra depois da cor e antes da miniatura, pela mesma
  // razão que a cor: `desenhar` redimensiona os pixels já queimados, então o
  // texto sai proporcional na tira do telão e na foto do álbum sem um
  // segundo cálculo de posição ou de tamanho de fonte para o thumb.
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
