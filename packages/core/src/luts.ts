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
