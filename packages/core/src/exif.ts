/** Ler orientação ANTES de reencodar: reencode apaga o EXIF inclusive a tag de orientação — foto entraria deitada. */
export type Orientacao = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const MARCADOR_APP1 = 0xffe1;
const TAG_ORIENTACAO = 0x0112;
const TAG_PONTEIRO_GPS = 0x8825;
const TAG_DATETIME = 0x0132;
const TAG_EXIF_IFD = 0x8769;
const TAG_DATETIME_ORIGINAL = 0x9003;
const TAG_DATETIME_DIGITIZED = 0x9004;
const TIPO_ASCII = 2;
const TIPO_SHORT = 3;
const TIPO_LONG = 4;

type Tiff = { visao: DataView; inicio: number; littleEndian: boolean };

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
    // SHORT mora nos 2 primeiros bytes do campo de 4; ler sempre 16 bits daria offset errado no GPS.
    const tipo = visao.getUint16(entrada + 2, littleEndian);
    const valor =
      tipo === TIPO_SHORT
        ? visao.getUint16(entrada + 8, littleEndian)
        : visao.getUint32(entrada + 8, littleEndian);

    aoEncontrar(tag, valor);
  }
}

function lerAsciiDoIfd(tiff: Tiff, ifdRelativo: number, procurada: number): string | null {
  const { visao, inicio, littleEndian } = tiff;
  const ifd = inicio + ifdRelativo;
  if (ifd + 2 > visao.byteLength) return null;

  const quantas = visao.getUint16(ifd, littleEndian);

  for (let n = 0; n < quantas; n += 1) {
    const entrada = ifd + 2 + n * 12;
    if (entrada + 12 > visao.byteLength) return null;

    const tag = visao.getUint16(entrada, littleEndian);
    if (tag !== procurada) continue;

    const tipo = visao.getUint16(entrada + 2, littleEndian);
    if (tipo !== TIPO_ASCII) return null;

    const count = visao.getUint32(entrada + 4, littleEndian);
    if (count < 1 || count > 32) return null;

    const campo = entrada + 8;
    const origem = count <= 4 ? campo : inicio + visao.getUint32(campo, littleEndian);
    if (origem < 0 || origem + count > visao.byteLength) return null;

    const bytes = new Uint8Array(visao.buffer, visao.byteOffset + origem, count);
    let fim = bytes.length;
    while (fim > 0 && bytes[fim - 1] === 0) fim -= 1;
    return String.fromCharCode(...bytes.subarray(0, fim));
  }

  return null;
}

function offsetDoIfdExif(tiff: Tiff): number | null {
  const { visao, inicio, littleEndian } = tiff;
  const offsetIfd0 = visao.getUint32(inicio + 4, littleEndian);
  const ifd0 = inicio + offsetIfd0;
  if (ifd0 + 2 > visao.byteLength) return null;

  const quantas = visao.getUint16(ifd0, littleEndian);

  for (let n = 0; n < quantas; n += 1) {
    const entrada = ifd0 + 2 + n * 12;
    if (entrada + 12 > visao.byteLength) return null;

    const tag = visao.getUint16(entrada, littleEndian);
    if (tag !== TAG_EXIF_IFD) continue;

    const tipo = visao.getUint16(entrada + 2, littleEndian);
    if (tipo !== TIPO_LONG) return null;
    return visao.getUint32(entrada + 8, littleEndian);
  }

  return null;
}

function parseExifDate(texto: string): Date | null {
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(texto);
  if (!m) return null;

  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const hora = Number(m[4]);
  const minuto = Number(m[5]);
  const segundo = Number(m[6]);
  if (ano < 1990 || ano > 2100) return null;

  const em = new Date(Date.UTC(ano, mes - 1, dia, hora, minuto, segundo));
  if (
    Number.isNaN(em.getTime()) ||
    em.getUTCFullYear() !== ano ||
    em.getUTCMonth() !== mes - 1 ||
    em.getUTCDate() !== dia
  ) {
    return null;
  }

  return em;
}

/** 1 quando não há EXIF — equivale a "pixels já estão certos", é o padrão seguro. */
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

/** Para verificar que a remoção funcionou — o EXIF sai sempre, não condicionalmente. Remoção condicional um dia não roda. */
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

/** UTC do `Date` são os da parede da câmera sem fuso — EXIF não traz offset; quem persiste aplica fuso do evento. */
export function lerCapturadaEm(bytes: Uint8Array): Date | null {
  const tiff = acharTiff(bytes);
  if (!tiff) return null;

  const offsetIfd0 = tiff.visao.getUint32(tiff.inicio + 4, tiff.littleEndian);
  const exifIfd = offsetDoIfdExif(tiff);

  const originais = [
    exifIfd !== null ? lerAsciiDoIfd(tiff, exifIfd, TAG_DATETIME_ORIGINAL) : null,
    exifIfd !== null ? lerAsciiDoIfd(tiff, exifIfd, TAG_DATETIME_DIGITIZED) : null,
    lerAsciiDoIfd(tiff, offsetIfd0, TAG_DATETIME),
  ];

  for (const texto of originais) {
    if (!texto) continue;
    const em = parseExifDate(texto);
    if (em) return em;
  }

  return null;
}

export type Transformacao = {
  /** Graus no sentido horário. */
  girar: 0 | 90 | 180 | 270;
  espelhar: boolean;
  /** Quando o giro é 90 ou 270, largura e altura trocam no destino. */
  trocaEixos: boolean;
};

/** As 8 orientações incluem 4 espelhadas — ignorar produz foto invertida. */
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
