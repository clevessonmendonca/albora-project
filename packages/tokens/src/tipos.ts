/**
 * As cinco cores. Não seis.
 *
 * Todo neutro do produto é opacidade sobre `tinta` ou `papel` — nunca uma
 * rampa de cinza derivada. Rampa derivada perde a temperatura da paleta, e a
 * temperatura é o que faz a identidade do casal parecer dele e não do Albora.
 */
export type Cores = {
  tinta: string;
  papel: string;
  acento: string;
  acentoSobreClaro: string;
  realce: string;
};

export type Fontes = {
  titulo: string;
  corpo: string;
};

export type Escala = {
  raio: string;
  espaco: string;
};

export type Fundo = "escuro" | "claro";

export type Tokens = {
  cores: Cores;
  fontes: Fontes;
  escala: Escala;
  fundo: Fundo;
};

/** Camada da cadeia. Cada uma sobrepõe a anterior, campo a campo. */
export type CamadaTokens = {
  cores?: Partial<Cores>;
  fontes?: Partial<Fontes>;
  escala?: Partial<Escala>;
  fundo?: Fundo;
};

export type EntradaResolucao = {
  /** A marca Albora. Piso da cadeia, sempre presente. */
  marca: Tokens;
  /** O vertical — casamento, 15 anos, formatura. */
  pack?: CamadaTokens;
  /** O evento. Ganha de todo mundo: é a identidade do casal. */
  evento?: CamadaTokens;
};
