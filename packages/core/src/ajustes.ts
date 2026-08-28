/** Rodam por pixel (não CSS) porque a vinheta depende da posição do pixel — dois caminhos dariam thumb divergente. */
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

/** Passagem por pixel custa uma varredura inteira — caso comum é escolher filtro e enviar sem ajustes. */
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

/** Ordem: luz → calor → contraste → vinheta. Inverter amplificaria erro de exposição ou criaria anel de borda. */
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
  // Normaliza pela diagonal: sem isso a vinheta fecharia muito mais pelos lados em fotos verticais (3 de cada 4).
  const raioMaximo = Math.hypot(meioX, meioY);

  for (let y = 0; y < altura; y += 1) {
    const distanciaY = (y - meioY) ** 2;

    for (let x = 0; x < largura; x += 1) {
      const p = (y * largura + x) * 4;

      let r = dados[p] ?? 0;
      let g = dados[p + 1] ?? 0;
      let b = dados[p + 2] ?? 0;

      if (luz !== 0) {
        // Multiplicativo, não aditivo — aditivo lava o preto; multiplicar preserva sombra e abre médio como câmera.
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
          // t² para fechar suave — linear criaria anel visível como defeito de lente.
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
