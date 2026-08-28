/** Sem IA generativa (ADR 0007). Matemática aqui para os dois renderizadores produzirem a mesma imagem. */
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

export function paraFiltroCss(a: Ajustes): string {
  return [
    `sepia(${a.sepia})`,
    `saturate(${a.saturacao})`,
    `hue-rotate(${a.matiz}deg)`,
    `brightness(${a.brilho})`,
    `contrast(${a.contraste})`,
  ].join(" ");
}

/** Aplica ajustes por pixel na mesma ordem de `paraFiltroCss` — para Expo (sem ctx.filter) produzir mesma estética. */
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
