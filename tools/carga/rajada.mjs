/**
 * O cronograma de captura. É a peça que decide se o teste vale alguma coisa.
 *
 * 150 uploads em 20 minutos **não** é um a cada oito segundos. A carga do
 * Albora é rajada, não fluxo (`docs/architecture.md` §1): ninguém fotografa
 * por três minutos e aí quarenta pessoas fotografam juntas quando o bolo é
 * cortado. Um cronograma de taxa constante passaria num servidor que derruba
 * a festa inteira no primeiro pico.
 *
 * O sorteio é semeado de propósito: duas execuções com a mesma semente
 * comparam número com número, e não com sorte.
 */

/** @param {string} texto */
function semear(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** @param {string} textoDaSemente */
export function sorteador(textoDaSemente) {
  let estado = semear(textoDaSemente);
  return function proximo() {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @typedef {object} PlanoDeRajada
 * @property {number} total quantas capturas no total
 * @property {number} duracaoMs a janela inteira
 * @property {number} picos quantos momentos de aglomeração
 * @property {number} fracaoEmPico 0..1 — quanto da carga cai dentro dos picos
 * @property {number} duracaoPicoMs largura de cada pico
 * @property {string} semente
 */

/**
 * Instantes de captura, em ms desde o início da janela, ordenados.
 *
 * @param {PlanoDeRajada} plano
 * @returns {number[]}
 */
export function gerarRajada(plano) {
  const { total, duracaoMs, picos, fracaoEmPico, duracaoPicoMs, semente } = plano;

  if (!Number.isInteger(total) || total < 0) throw new RangeError(`total inválido: ${total}`);
  if (!(duracaoMs > 0)) throw new RangeError(`duracaoMs inválida: ${duracaoMs}`);
  if (!(fracaoEmPico >= 0 && fracaoEmPico <= 1)) {
    throw new RangeError(`fracaoEmPico fora de 0..1: ${fracaoEmPico}`);
  }
  if (fracaoEmPico > 0 && (!Number.isInteger(picos) || picos < 1)) {
    throw new RangeError(`picos inválido: ${picos}`);
  }
  if (fracaoEmPico > 0 && !(duracaoPicoMs > 0)) {
    throw new RangeError(`duracaoPicoMs inválida: ${duracaoPicoMs}`);
  }
  if (total === 0) return [];

  const sortear = sorteador(semente);
  const emPico = Math.round(total * fracaoEmPico);
  const espalhados = total - emPico;

  /** @type {number[]} */
  const instantes = [];

  for (let i = 0; i < espalhados; i += 1) {
    instantes.push(sortear() * duracaoMs);
  }

  const meio = duracaoPicoMs / 2;
  for (let p = 0; p < (emPico > 0 ? picos : 0); p += 1) {
    // Um a mais nos primeiros picos quando a divisão não é exata; o total
    // fechar importa mais que os picos serem idênticos.
    const quantos = Math.floor(emPico / picos) + (p < emPico % picos ? 1 : 0);
    const centro = Math.min(
      Math.max(((p + 0.5) / picos) * duracaoMs, meio),
      duracaoMs - meio,
    );

    for (let i = 0; i < quantos; i += 1) {
      // Soma de dois uniformes: distribuição triangular, densa no centro. O
      // pico do bolo tem um instante mais cheio que suas bordas.
      const desvio = ((sortear() + sortear()) / 2 - 0.5) * duracaoPicoMs;
      instantes.push(Math.min(Math.max(centro + desvio, 0), duracaoMs));
    }
  }

  return instantes.sort((a, b) => a - b);
}

/**
 * A janela deslizante mais cheia. É o número que prova que o cronograma é
 * rajada e não taxa — e, no relatório, o pico que o servidor de fato viu.
 *
 * @param {number[]} instantesOrdenados
 * @param {number} larguraMs
 * @returns {{ quantos: number, comecaEm: number }}
 */
export function janelaMaisCheia(instantesOrdenados, larguraMs) {
  if (instantesOrdenados.length === 0) return { quantos: 0, comecaEm: 0 };

  let melhor = { quantos: 0, comecaEm: instantesOrdenados[0] };
  let fim = 0;

  for (let inicio = 0; inicio < instantesOrdenados.length; inicio += 1) {
    while (
      fim < instantesOrdenados.length &&
      instantesOrdenados[fim] - instantesOrdenados[inicio] <= larguraMs
    ) {
      fim += 1;
    }
    const quantos = fim - inicio;
    if (quantos > melhor.quantos) {
      melhor = { quantos, comecaEm: instantesOrdenados[inicio] };
    }
  }

  return melhor;
}

/**
 * Atribui cada captura a um convidado.
 *
 * Sorteado, não circular: no pico do bolo é o **mesmo** convidado que dispara
 * três fotos seguidas, e é isso que enche a fila de um aparelho só. Uma
 * distribuição circular perfeita daria a cada aparelho uma fila de um item, e
 * o teste nunca exercitaria a drenagem em série do `drenar` de `@albora/core`.
 *
 * @param {number} quantasCapturas
 * @param {number} quantosConvidados
 * @param {string} semente
 * @returns {number[]} índice do convidado, por captura
 */
export function distribuirEntreConvidados(quantasCapturas, quantosConvidados, semente) {
  if (!Number.isInteger(quantosConvidados) || quantosConvidados < 1) {
    throw new RangeError(`quantosConvidados inválido: ${quantosConvidados}`);
  }

  const sortear = sorteador(`convidados:${semente}`);
  return Array.from({ length: quantasCapturas }, () =>
    Math.min(quantosConvidados - 1, Math.floor(sortear() * quantosConvidados)),
  );
}
