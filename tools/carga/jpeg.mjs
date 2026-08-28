/**
 * Codificador JPEG baseline, sem dependência.
 *
 * O `confirm` lê os primeiros bytes do objeto no bucket e confere os magic
 * bytes (`validarConteudo`, em `packages/core/src/midia.ts`): bytes aleatórios
 * seriam recusados com 422 e o teste mediria a rejeição em vez do caminho.
 * Colar um cabeçalho falso na frente de lixo passaria pela validação e
 * deixaria o bucket cheio de objeto que não abre — o teste de carga é o
 * ensaio do evento real, e o que ele grava tem de ser foto de verdade.
 *
 * Baseline, 4:4:4, tabelas de Huffman padrão do Anexo K da ITU-T T.81.
 */

const ZIGUEZAGUE = [
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20,
  13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52,
  45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
];

const QUANT_LUMA = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113,
  92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
];

const QUANT_CROMA = [
  17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99,
  47, 66, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99,
];

const DC_LUMA_BITS = [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
const DC_CROMA_BITS = [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
const DC_VALORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const AC_LUMA_BITS = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d];
const AC_LUMA_VALORES = [
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07,
  0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0,
  0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
  0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
  0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69,
  0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
  0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7,
  0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5,
  0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
  0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8,
  0xf9, 0xfa,
];

const AC_CROMA_BITS = [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77];
const AC_CROMA_VALORES = [
  0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71,
  0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91, 0xa1, 0xb1, 0xc1, 0x09, 0x23, 0x33, 0x52, 0xf0,
  0x15, 0x62, 0x72, 0xd1, 0x0a, 0x16, 0x24, 0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26,
  0x27, 0x28, 0x29, 0x2a, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48,
  0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
  0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87,
  0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5,
  0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3,
  0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda,
  0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8,
  0xf9, 0xfa,
];

/** @param {number[]} bits @param {number[]} valores */
function tabelaDeCodigos(bits, valores) {
  /** @type {Map<number, {codigo:number, tamanho:number}>} */
  const tabela = new Map();
  let codigo = 0;
  let i = 0;

  for (let tamanho = 1; tamanho <= 16; tamanho += 1) {
    for (let k = 0; k < bits[tamanho - 1]; k += 1) {
      tabela.set(valores[i], { codigo, tamanho });
      codigo += 1;
      i += 1;
    }
    codigo <<= 1;
  }

  return tabela;
}

/** @param {number[]} base @param {number} qualidade */
function escalar(base, qualidade) {
  const q = Math.min(100, Math.max(1, Math.round(qualidade)));
  const fator = q < 50 ? 5000 / q : 200 - 2 * q;
  return base.map((v) => Math.min(255, Math.max(1, Math.floor((v * fator + 50) / 100))));
}

class Fita {
  constructor() {
    /** @type {number[]} */
    this.bytes = [];
    this.acumulador = 0;
    this.livres = 8;
  }

  /** @param {number} valor @param {number} tamanho */
  escrever(valor, tamanho) {
    for (let i = tamanho - 1; i >= 0; i -= 1) {
      this.livres -= 1;
      this.acumulador |= ((valor >> i) & 1) << this.livres;
      if (this.livres === 0) this.despejar();
    }
  }

  despejar() {
    this.bytes.push(this.acumulador);
    // 🔴 Byte stuffing. Um 0xFF cru no fluxo entropia seria lido como início
    // de marcador e o decodificador abandonaria a imagem no meio.
    if (this.acumulador === 0xff) this.bytes.push(0x00);
    this.acumulador = 0;
    this.livres = 8;
  }

  fechar() {
    // Preenche com 1s: o padrão manda completar o último byte, e 0s poderiam
    // formar um código de Huffman válido a mais.
    while (this.livres < 8) {
      this.livres -= 1;
      this.acumulador |= 1 << this.livres;
      if (this.livres === 0) this.despejar();
    }
  }
}

const COS = new Float64Array(64);
for (let x = 0; x < 8; x += 1) {
  for (let u = 0; u < 8; u += 1) {
    COS[x * 8 + u] = Math.cos(((2 * x + 1) * u * Math.PI) / 16) * (u === 0 ? Math.SQRT1_2 : 1);
  }
}

/** DCT 2-D separável: 8 linhas + 8 colunas, em vez de 64 somas de 64 termos. */
function dct(bloco, saida) {
  const meio = new Float64Array(64);

  for (let y = 0; y < 8; y += 1) {
    for (let u = 0; u < 8; u += 1) {
      let soma = 0;
      for (let x = 0; x < 8; x += 1) soma += bloco[y * 8 + x] * COS[x * 8 + u];
      meio[y * 8 + u] = soma;
    }
  }

  for (let u = 0; u < 8; u += 1) {
    for (let v = 0; v < 8; v += 1) {
      let soma = 0;
      for (let y = 0; y < 8; y += 1) soma += meio[y * 8 + u] * COS[y * 8 + v];
      saida[v * 8 + u] = soma / 4;
    }
  }
}

/** @param {number} valor */
function categoria(valor) {
  let n = 0;
  let v = Math.abs(valor);
  while (v > 0) {
    v >>= 1;
    n += 1;
  }
  return n;
}

function codificarBloco(fita, bloco, quant, dcAnterior, tabelaDc, tabelaAc) {
  const coef = new Float64Array(64);
  dct(bloco, coef);

  const quantizado = new Int32Array(64);
  for (let i = 0; i < 64; i += 1) {
    quantizado[i] = Math.round(coef[ZIGUEZAGUE[i]] / quant[ZIGUEZAGUE[i]]);
  }

  const diferenca = quantizado[0] - dcAnterior;
  const catDc = categoria(diferenca);
  const codigoDc = tabelaDc.get(catDc);
  fita.escrever(codigoDc.codigo, codigoDc.tamanho);
  if (catDc > 0) {
    fita.escrever(diferenca < 0 ? diferenca + (1 << catDc) - 1 : diferenca, catDc);
  }

  let ultimo = 0;
  for (let i = 63; i > 0; i -= 1) {
    if (quantizado[i] !== 0) {
      ultimo = i;
      break;
    }
  }

  let corrida = 0;
  for (let i = 1; i <= ultimo; i += 1) {
    if (quantizado[i] === 0) {
      corrida += 1;
      continue;
    }
    while (corrida > 15) {
      const zrl = tabelaAc.get(0xf0);
      fita.escrever(zrl.codigo, zrl.tamanho);
      corrida -= 16;
    }
    const cat = categoria(quantizado[i]);
    const simbolo = tabelaAc.get((corrida << 4) | cat);
    fita.escrever(simbolo.codigo, simbolo.tamanho);
    fita.escrever(
      quantizado[i] < 0 ? quantizado[i] + (1 << cat) - 1 : quantizado[i],
      cat,
    );
    corrida = 0;
  }

  if (ultimo < 63) {
    const eob = tabelaAc.get(0x00);
    fita.escrever(eob.codigo, eob.tamanho);
  }

  return quantizado[0];
}

/** @param {number[]} destino @param {number[]} bits @param {number[]} valores @param {number} id */
function segmentoHuffman(destino, bits, valores, id) {
  const tamanho = 3 + 16 + valores.length;
  destino.push(0xff, 0xc4, (tamanho >> 8) & 0xff, tamanho & 0xff, id, ...bits, ...valores);
}

/**
 * Uma cena sintética com a textura de uma foto de festa: fundo suave, algumas
 * manchas de luz e grão fino.
 *
 * O grão não é enfeite — é o que dá ao arquivo o peso de uma foto de verdade.
 * Um gradiente puro comprimiria para poucos KB e o teste mediria uma rede que
 * o evento nunca vai ter.
 *
 * @param {number} largura @param {number} altura @param {() => number} sortear @param {number} grao
 */
function cena(largura, altura, sortear, grao) {
  const pixels = new Uint8ClampedArray(largura * altura * 3);
  const focos = Array.from({ length: 6 }, () => ({
    x: sortear() * largura,
    y: sortear() * altura,
    raio: (0.15 + sortear() * 0.25) * Math.max(largura, altura),
    forca: 40 + sortear() * 70,
  }));

  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      let luz = 40 + 60 * (y / altura);
      for (const f of focos) {
        const d = Math.hypot(x - f.x, y - f.y) / f.raio;
        if (d < 1) luz += f.forca * (1 - d) * (1 - d);
      }

      const i = (y * largura + x) * 3;
      pixels[i] = luz + (sortear() - 0.5) * grao + 25;
      pixels[i + 1] = luz + (sortear() - 0.5) * grao;
      pixels[i + 2] = luz + (sortear() - 0.5) * grao - 15;
    }
  }

  return pixels;
}

/**
 * @param {object} opcoes
 * @param {number} [opcoes.largura]
 * @param {number} [opcoes.altura]
 * @param {number} [opcoes.qualidade]
 * @param {number} [opcoes.grao]
 * @param {() => number} opcoes.sortear
 * @returns {{ bytes: Uint8Array, largura: number, altura: number }}
 */
export function gerarJpeg({ largura = 1440, altura = 1920, qualidade = 82, grao = 20, sortear }) {
  if (!Number.isInteger(largura) || largura < 8 || !Number.isInteger(altura) || altura < 8) {
    throw new RangeError(`dimensão inválida: ${largura}x${altura}`);
  }

  const quantLuma = escalar(QUANT_LUMA, qualidade);
  const quantCroma = escalar(QUANT_CROMA, qualidade);
  const pixels = cena(largura, altura, sortear, grao);

  /** @type {number[]} */
  const cabecalho = [0xff, 0xd8];

  cabecalho.push(0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00);

  cabecalho.push(0xff, 0xdb, 0x00, 0x43, 0x00, ...ZIGUEZAGUE.map((z) => quantLuma[z]));
  cabecalho.push(0xff, 0xdb, 0x00, 0x43, 0x01, ...ZIGUEZAGUE.map((z) => quantCroma[z]));

  cabecalho.push(
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (altura >> 8) & 0xff, altura & 0xff,
    (largura >> 8) & 0xff, largura & 0xff,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x01,
    0x03, 0x11, 0x01,
  );

  segmentoHuffman(cabecalho, DC_LUMA_BITS, DC_VALORES, 0x00);
  segmentoHuffman(cabecalho, AC_LUMA_BITS, AC_LUMA_VALORES, 0x10);
  segmentoHuffman(cabecalho, DC_CROMA_BITS, DC_VALORES, 0x01);
  segmentoHuffman(cabecalho, AC_CROMA_BITS, AC_CROMA_VALORES, 0x11);

  cabecalho.push(0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00);

  const dcLuma = tabelaDeCodigos(DC_LUMA_BITS, DC_VALORES);
  const acLuma = tabelaDeCodigos(AC_LUMA_BITS, AC_LUMA_VALORES);
  const dcCroma = tabelaDeCodigos(DC_CROMA_BITS, DC_VALORES);
  const acCroma = tabelaDeCodigos(AC_CROMA_BITS, AC_CROMA_VALORES);

  const fita = new Fita();
  const y = new Float64Array(64);
  const cb = new Float64Array(64);
  const cr = new Float64Array(64);
  let dcY = 0;
  let dcCb = 0;
  let dcCr = 0;

  for (let by = 0; by < altura; by += 8) {
    for (let bx = 0; bx < largura; bx += 8) {
      for (let j = 0; j < 8; j += 1) {
        // Repete a última linha/coluna quando a imagem não fecha em 8: é o que
        // o padrão pede, e é invisível porque o SOF diz o tamanho real.
        const ly = Math.min(altura - 1, by + j);
        for (let i = 0; i < 8; i += 1) {
          const lx = Math.min(largura - 1, bx + i);
          const p = (ly * largura + lx) * 3;
          const r = pixels[p];
          const g = pixels[p + 1];
          const b = pixels[p + 2];
          y[j * 8 + i] = 0.299 * r + 0.587 * g + 0.114 * b - 128;
          cb[j * 8 + i] = -0.168736 * r - 0.331264 * g + 0.5 * b;
          cr[j * 8 + i] = 0.5 * r - 0.418688 * g - 0.081312 * b;
        }
      }

      dcY = codificarBloco(fita, y, quantLuma, dcY, dcLuma, acLuma);
      dcCb = codificarBloco(fita, cb, quantCroma, dcCb, dcCroma, acCroma);
      dcCr = codificarBloco(fita, cr, quantCroma, dcCr, dcCroma, acCroma);
    }
  }

  fita.fechar();

  const bytes = new Uint8Array(cabecalho.length + fita.bytes.length + 2);
  bytes.set(cabecalho, 0);
  bytes.set(fita.bytes, cabecalho.length);
  bytes.set([0xff, 0xd9], cabecalho.length + fita.bytes.length);

  return { bytes, largura, altura };
}
