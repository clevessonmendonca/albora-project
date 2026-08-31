/**
 * Percentis por posto (*nearest-rank*), sem interpolação.
 *
 * Média engana num teste de rajada: dez uploads instantâneos e um de trinta
 * segundos dão a mesma média de um caminho uniformemente medíocre, e só o
 * segundo caso é aceitável. O que decide se o convidado desiste é a cauda —
 * por isso p95 e p99 são reportados, e o pior caso junto deles.
 *
 * Sem interpolação porque cada valor devolvido é um upload que **de fato**
 * aconteceu. Um p99 interpolado é um número que ninguém esperou.
 */

/**
 * @param {number[]} ordenados valores já em ordem crescente
 * @param {number} p percentil em 0..100
 * @returns {number|null} `null` quando não há amostra
 */
export function percentil(ordenados, p) {
  if (!Array.isArray(ordenados) || ordenados.length === 0) return null;
  if (!Number.isFinite(p) || p < 0 || p > 100) {
    throw new RangeError(`percentil fora de 0..100: ${p}`);
  }

  const posto = Math.ceil((p / 100) * ordenados.length);
  const indice = Math.min(ordenados.length - 1, Math.max(0, posto - 1));
  return ordenados[indice];
}

/**
 * @typedef {object} Resumo
 * @property {number} n
 * @property {number|null} min
 * @property {number|null} p50
 * @property {number|null} p95
 * @property {number|null} p99
 * @property {number|null} max
 * @property {number|null} media
 */

/**
 * Resumo de uma etapa. Não muta a entrada — a lista de amostras é reusada
 * pelo relatório bruto depois de o resumo já ter sido calculado.
 *
 * @param {number[]} valores
 * @returns {Resumo}
 */
export function resumo(valores) {
  const finitos = valores.filter((v) => Number.isFinite(v));
  if (finitos.length === 0) {
    return { n: 0, min: null, p50: null, p95: null, p99: null, max: null, media: null };
  }

  const ordenados = [...finitos].sort((a, b) => a - b);
  const soma = ordenados.reduce((acc, v) => acc + v, 0);

  return {
    n: ordenados.length,
    min: ordenados[0],
    p50: percentil(ordenados, 50),
    p95: percentil(ordenados, 95),
    p99: percentil(ordenados, 99),
    max: ordenados[ordenados.length - 1],
    media: soma / ordenados.length,
  };
}

/**
 * Contagem por código de resposta.
 *
 * Somar 429 com 500 esconde o que importa: o primeiro é o rate limit
 * funcionando como projetado, o segundo é defeito. Um teste que reporta
 * "12 erros" não distingue "o portão segurou" de "o servidor caiu".
 *
 * @param {{status:number, codigo:string|null}[]} falhas
 * @returns {Record<string, number>}
 */
export function contarPorCodigo(falhas) {
  /** @type {Record<string, number>} */
  const contagem = {};
  for (const f of falhas) {
    const chave = f.codigo ? `${f.status} ${f.codigo}` : String(f.status);
    contagem[chave] = (contagem[chave] ?? 0) + 1;
  }
  return contagem;
}
