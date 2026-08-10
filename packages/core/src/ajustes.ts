/**
 * Os quatro ajustes manuais, por cima do preset.
 *
 * São coisa diferente de `Ajustes` de `luts.ts`: aquele é a receita fixa de um
 * filtro; estes são o que o convidado move com o dedo. O preset dá a estética
 * do evento, o ajuste corrige a foto — a luz do salão erra, e quem estava lá
 * sabe para que lado.
 *
 * Todos os quatro rodam por pixel, e não em `filter` de CSS, por causa da
 * vinheta: ela depende da POSIÇÃO do pixel, que CSS não sabe fazer. Fazer três
 * em CSS e uma em canvas daria dois caminhos com arredondamento diferente, e a
 * miniatura deixaria de bater com a foto que sobe.
 */

export type AjustesManuais = {
  /** Exposição. -1 escurece, 0 neutro, 1 clareia. */
  luz: number;
  /** Temperatura. -1 puxa para o azul, 1 para o âmbar. */
  calor: number;
  contraste: number;
  /** Escurecimento das bordas. 0 nenhum, 1 forte. Nunca negativo. */
  vinheta: number;
};

export const AJUSTES_NEUTROS: AjustesManuais = { luz: 0, calor: 0, contraste: 0, vinheta: 0 };

/**
 * Quem não mexeu em nada não paga nada.
 *
 * A passagem por pixel custa uma varredura da imagem inteira, e o caso comum é
 * o convidado escolher um filtro e enviar. Sem esta porta, todo mundo pagaria
 * o preço de um recurso que a maioria não usa.
 */
export function saoNeutros(a: AjustesManuais): boolean {
  return a.luz === 0 && a.calor === 0 && a.contraste === 0 && a.vinheta === 0;
}

const GANHO_DE_LUZ = 0.55;
const GANHO_DE_CALOR = 26;
const GANHO_DE_CONTRASTE = 0.6;
const FORCA_DA_VINHETA = 0.75;
/** A vinheta só começa a fechar depois disto, em raio normalizado. */
const INICIO_DA_VINHETA = 0.55;

function limitar(v: number): number {
  return Math.min(1, Math.max(-1, v));
}

/**
 * Aplica os quatro **no lugar**, na ordem em que uma câmera aplicaria: luz,
 * temperatura, contraste, e a vinheta por último.
 *
 * A ordem importa. Contraste antes da luz amplificaria o erro de exposição em
 * vez de corrigi-lo, e vinheta antes do contraste viraria um anel visível na
 * borda em vez de um escurecimento.
 */
export function aplicarAjustes(
  dados: Uint8ClampedArray,
  largura: number,
  altura: number,
  ajustes: AjustesManuais,
): void {
  if (saoNeutros(ajustes)) return;

  const luz = limitar(ajustes.luz) * GANHO_DE_LUZ;
  const calor = limitar(ajustes.calor) * GANHO_DE_CALOR;
  const contraste = 1 + limitar(ajustes.contraste) * GANHO_DE_CONTRASTE;
  const vinheta = Math.min(1, Math.max(0, ajustes.vinheta)) * FORCA_DA_VINHETA;

  const meioX = largura / 2;
  const meioY = altura / 2;
  // Normaliza pela diagonal: sem isso, a vinheta de uma foto vertical fecharia
  // muito mais pelos lados que pelo topo, e três de cada quatro fotos de festa
  // são verticais.
  const raioMaximo = Math.hypot(meioX, meioY);

  for (let y = 0; y < altura; y += 1) {
    const distanciaY = (y - meioY) ** 2;

    for (let x = 0; x < largura; x += 1) {
      const p = (y * largura + x) * 4;

      let r = dados[p] ?? 0;
      let g = dados[p + 1] ?? 0;
      let b = dados[p + 2] ?? 0;

      if (luz !== 0) {
        // Multiplicativo, não aditivo: aditivo lava o preto e a foto perde o
        // chão. Multiplicar preserva a sombra e abre o médio, que é o que a
        // exposição de câmera faz.
        const ganho = 1 + luz;
        r *= ganho;
        g *= ganho;
        b *= ganho;
      }

      if (calor !== 0) {
        r += calor;
        b -= calor;
      }

      if (contraste !== 1) {
        r = (r - 128) * contraste + 128;
        g = (g - 128) * contraste + 128;
        b = (b - 128) * contraste + 128;
      }

      if (vinheta !== 0) {
        const distancia = Math.sqrt(distanciaY + (x - meioX) ** 2) / raioMaximo;
        if (distancia > INICIO_DA_VINHETA) {
          const t = (distancia - INICIO_DA_VINHETA) / (1 - INICIO_DA_VINHETA);
          // Ao quadrado para a borda fechar suave. Linear cria um anel que o
          // olho enxerga como defeito de lente.
          const fator = 1 - vinheta * t * t;
          r *= fator;
          g *= fator;
          b *= fator;
        }
      }

      dados[p] = r;
      dados[p + 1] = g;
      dados[p + 2] = b;
    }
  }
}
