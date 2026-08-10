/**
 * Leitura de EXIF, antes de destruí-lo.
 *
 * O EXIF é removido no cliente, antes do upload: coordenada de GPS em foto de
 * convidado é exposição real de LGPD, e a foto do casamento de alguém não
 * precisa carregar o endereço da casa da avó.
 *
 * **Mas remover não basta, e é aqui que quase todo mundo erra.** Reencodar
 * pelo canvas apaga o EXIF de graça — inclusive a tag de orientação. O
 * iPhone fotografa em paisagem gravando os pixels de lado e corrigindo pela
 * tag; sem ela, a foto entra no álbum deitada. Por isso a ordem é: **ler a
 * orientação, aplicar nos pixels, e só então reencodar.**
 */

export type Orientacao = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const MARCADOR_APP1 = 0xffe1;
const TAG_ORIENTACAO = 0x0112;
const TAG_PONTEIRO_GPS = 0x8825;

type Tiff = { visao: DataView; inicio: number; littleEndian: boolean };

/**
 * Localiza o bloco TIFF dentro do APP1. Devolve `null` quando não há EXIF —
 * o que é o caso de toda imagem que já passou por reencode.
 */
function acharTiff(bytes: Uint8Array): Tiff | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  const visao = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let i = 2;

  while (i + 4 <= bytes.length) {
    const marcador = visao.getUint16(i, false);
    if ((marcador & 0xff00) !== 0xff00) return null;

    const tamanho = visao.getUint16(i + 2, false);
    if (tamanho < 2) return null;

    if (marcador === MARCADOR_APP1) {
      const cabecalho = i + 4;
      // "Exif\0\0"
      const exif = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
      const casa = exif.every((b, k) => bytes[cabecalho + k] === b);
      if (!casa) return null;

      const inicio = cabecalho + 6;
      if (inicio + 8 > bytes.length) return null;

      const ordem = visao.getUint16(inicio, false);
      if (ordem !== 0x4949 && ordem !== 0x4d4d) return null;

      return { visao, inicio, littleEndian: ordem === 0x4949 };
    }

    i += 2 + tamanho;
  }

  return null;
}

function percorrerIfd0(
  tiff: Tiff,
  aoEncontrar: (tag: number, valor: number) => void,
): void {
  const { visao, inicio, littleEndian } = tiff;

  const offsetIfd0 = visao.getUint32(inicio + 4, littleEndian);
  const ifd0 = inicio + offsetIfd0;
  if (ifd0 + 2 > visao.byteLength) return;

  const quantas = visao.getUint16(ifd0, littleEndian);

  for (let n = 0; n < quantas; n += 1) {
    const entrada = ifd0 + 2 + n * 12;
    if (entrada + 12 > visao.byteLength) return;

    const tag = visao.getUint16(entrada, littleEndian);
    // O valor de uma entrada SHORT mora nos dois primeiros bytes do campo de
    // 4; LONG ocupa os quatro. Ler sempre 16 bits daria offset errado no GPS.
    const tipo = visao.getUint16(entrada + 2, littleEndian);
    const valor =
      tipo === 3
        ? visao.getUint16(entrada + 8, littleEndian)
        : visao.getUint32(entrada + 8, littleEndian);

    aoEncontrar(tag, valor);
  }
}

/**
 * Orientação declarada pela câmera. `1` quando não há EXIF — que é o mesmo
 * que "os pixels já estão certos", e é o padrão seguro.
 */
export function lerOrientacao(bytes: Uint8Array): Orientacao {
  const tiff = acharTiff(bytes);
  if (!tiff) return 1;

  let achada: Orientacao = 1;
  percorrerIfd0(tiff, (tag, valor) => {
    if (tag === TAG_ORIENTACAO && valor >= 1 && valor <= 8) {
      achada = valor as Orientacao;
    }
  });

  return achada;
}

/**
 * Diz se a imagem carrega bloco de GPS.
 *
 * Serve para **verificar** que a remoção funcionou, não para decidir se ela
 * acontece: o EXIF sai de toda foto, sempre, tenha GPS ou não. Uma remoção
 * condicional é uma remoção que um dia não roda.
 */
export function temGeolocalizacao(bytes: Uint8Array): boolean {
  const tiff = acharTiff(bytes);
  if (!tiff) return false;

  let tem = false;
  percorrerIfd0(tiff, (tag, valor) => {
    if (tag === TAG_PONTEIRO_GPS && valor > 0) tem = true;
  });

  return tem;
}

export function temExif(bytes: Uint8Array): boolean {
  return acharTiff(bytes) !== null;
}

export type Transformacao = {
  /** Graus no sentido horário. */
  girar: 0 | 90 | 180 | 270;
  espelhar: boolean;
  /** Quando o giro é 90 ou 270, largura e altura trocam no destino. */
  trocaEixos: boolean;
};

/**
 * A transformação que devolve os pixels à posição em que a foto foi vista.
 *
 * As oito orientações do EXIF incluem quatro espelhadas. Elas são raras, mas
 * ignorá-las produz a foto invertida — e num casamento isso é a aliança na
 * mão errada.
 */
export function transformacaoParaOrientacao(o: Orientacao): Transformacao {
  const tabela: Record<Orientacao, Transformacao> = {
    1: { girar: 0, espelhar: false, trocaEixos: false },
    2: { girar: 0, espelhar: true, trocaEixos: false },
    3: { girar: 180, espelhar: false, trocaEixos: false },
    4: { girar: 180, espelhar: true, trocaEixos: false },
    5: { girar: 90, espelhar: true, trocaEixos: true },
    6: { girar: 90, espelhar: false, trocaEixos: true },
    7: { girar: 270, espelhar: true, trocaEixos: true },
    8: { girar: 270, espelhar: false, trocaEixos: true },
  };

  return tabela[o];
}

/** Dimensões do destino depois de aplicada a orientação. */
export function dimensoesCorrigidas(
  largura: number,
  altura: number,
  o: Orientacao,
): { largura: number; altura: number } {
  return transformacaoParaOrientacao(o).trocaEixos
    ? { largura: altura, altura: largura }
    : { largura, altura };
}
