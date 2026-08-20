/**
 * Filtros paramétricos. Sem IA generativa, por decisão do ADR 0007.
 *
 * A matemática vive aqui porque os dois renderizadores precisam produzir
 * exatamente a mesma imagem. Se o app e a web interpretarem o mesmo filtro de
 * formas diferentes, o álbum sai com duas estéticas — e coerência entre todas
 * as fotos é literalmente o que o produto vende.
 */

export type Ajustes = {
  sepia: number;
  saturacao: number;
  matiz: number;
  brilho: number;
  contraste: number;
};

export type Filtro = {
  id: string;
  ajustes: Ajustes;
};

export const NEUTRO: Ajustes = {
  sepia: 0,
  saturacao: 1,
  matiz: 0,
  brilho: 1,
  contraste: 1,
};

/**
 * Intensidade contínua, de 0 a 1: interpola entre o neutro e o filtro cheio.
 * É o que permite ao convidado escolher "um pouco" em vez de tudo ou nada.
 */
export function aplicarIntensidade(ajustes: Ajustes, intensidade: number): Ajustes {
  const t = Math.min(1, Math.max(0, intensidade));
  const entre = (de: number, para: number) => de + (para - de) * t;

  return {
    sepia: entre(NEUTRO.sepia, ajustes.sepia),
    saturacao: entre(NEUTRO.saturacao, ajustes.saturacao),
    matiz: entre(NEUTRO.matiz, ajustes.matiz),
    brilho: entre(NEUTRO.brilho, ajustes.brilho),
    contraste: entre(NEUTRO.contraste, ajustes.contraste),
  };
}

/** Serializa para a sintaxe de `filter` — entendida por Canvas e por RN. */
export function paraFiltroCss(a: Ajustes): string {
  return [
    `sepia(${a.sepia})`,
    `saturate(${a.saturacao})`,
    `hue-rotate(${a.matiz}deg)`,
    `brightness(${a.brilho})`,
    `contrast(${a.contraste})`,
  ].join(" ");
}

/**
 * Aplica `Ajustes` (receita CSS: sepia → saturate → hue-rotate → brightness →
 * contrast) **nos pixels**, na mesma ordem de `paraFiltroCss`.
 *
 * Existe para o Desenhista Expo (sem `ctx.filter`) produzir a mesma estética
 * que a web — ADR 0007 / ADR 0010. Matemática aproximada do Filter Effects;
 * não é bit-idêntica ao Safari, e não precisa ser: o produto vende coerência
 * entre fotos do mesmo aparelho, não pixel-perfect cross-engine.
 */
export function aplicarFiltroCss(
  dados: Uint8ClampedArray,
  _largura: number,
  _altura: number,
  ajustes: Ajustes,
): void {
  if (ajustesIguais(ajustes, NEUTRO)) return;

  const total = dados.length;
  for (let i = 0; i < total; i += 4) {
    let r = (dados[i] ?? 0) / 255;
    let g = (dados[i + 1] ?? 0) / 255;
    let b = (dados[i + 2] ?? 0) / 255;

    if (ajustes.sepia !== 0) {
      const s = Math.min(1, Math.max(0, ajustes.sepia));
      const sr = 0.393 * r + 0.769 * g + 0.189 * b;
      const sg = 0.349 * r + 0.686 * g + 0.168 * b;
      const sb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = r + (sr - r) * s;
      g = g + (sg - g) * s;
      b = b + (sb - b) * s;
    }

    if (ajustes.saturacao !== 1) {
      const sat = Math.max(0, ajustes.saturacao);
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = l + (r - l) * sat;
      g = l + (g - l) * sat;
      b = l + (b - l) * sat;
    }

    if (ajustes.matiz !== 0) {
      const rad = (ajustes.matiz * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const nr =
        (0.213 + cos * 0.787 - sin * 0.213) * r +
        (0.715 - cos * 0.715 - sin * 0.715) * g +
        (0.072 - cos * 0.072 + sin * 0.928) * b;
      const ng =
        (0.213 - cos * 0.213 + sin * 0.143) * r +
        (0.715 + cos * 0.285 + sin * 0.14) * g +
        (0.072 - cos * 0.072 - sin * 0.283) * b;
      const nb =
        (0.213 - cos * 0.213 - sin * 0.787) * r +
        (0.715 - cos * 0.715 + sin * 0.715) * g +
        (0.072 + cos * 0.928 + sin * 0.072) * b;
      r = nr;
      g = ng;
      b = nb;
    }

    if (ajustes.brilho !== 1) {
      const br = Math.max(0, ajustes.brilho);
      r *= br;
      g *= br;
      b *= br;
    }

    if (ajustes.contraste !== 1) {
      const c = Math.max(0, ajustes.contraste);
      r = (r - 0.5) * c + 0.5;
      g = (g - 0.5) * c + 0.5;
      b = (b - 0.5) * c + 0.5;
    }

    dados[i] = Math.round(Math.min(1, Math.max(0, r)) * 255);
    dados[i + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255);
    dados[i + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255);
  }
}

function ajustesIguais(a: Ajustes, b: Ajustes): boolean {
  return (
    a.sepia === b.sepia &&
    a.saturacao === b.saturacao &&
    a.matiz === b.matiz &&
    a.brilho === b.brilho &&
    a.contraste === b.contraste
  );
}
