/**
 * As cinco cores. Não seis.
 *
 * Todo neutro do produto é opacidade sobre `papel` ou `noite` — nunca uma
 * rampa de cinza derivada. Rampa derivada perde a temperatura da paleta a cada
 * passo, e três telas depois a interface virou cinza de produto.
 *
 * `tinta` e `noite` são coisas diferentes e o erro de tratá-las como uma só é
 * visível: `tinta` é texto sobre claro, `noite` é o chão escuro do convidado.
 */
export type Cores = {
  papel: string;
  tinta: string;
  noite: string;
  /** Âmbar. Acento único, usado com parcimônia. */
  acento: string;
  /** Brasa. Acento raro — erro e destaque crítico. */
  critico: string;
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

/**
 * O que os componentes de fato consomem.
 *
 * Existe para que nenhuma tela precise decidir "quanto de opacidade num texto
 * secundário" — essa decisão é do sistema, e tomada uma vez. Componente que
 * escolhe o próprio neutro é o mesmo defeito que componente com hex literal,
 * só que invisível para o guard.
 */
export type EscalaSemantica = {
  /** Fundo de página. */
  bg: string;
  /** Card e superfície elevada. Elevação vem daqui, não de sombra. */
  superficie: string;
  /** Elevação máxima. */
  superficieAlta: string;
  /** Divisor e borda. */
  linha: string;
  /** Texto primário. */
  ink: string;
  /** Texto secundário. */
  ink2: string;
  /** Texto terciário e placeholder. */
  ink3: string;
  /** Preenchimento, barra, borda, ícone grande. **Nunca texto sobre claro.** */
  acento: string;
  /** O único seguro para texto em qualquer chão. */
  acentoTexto: string;
  critico: string;
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
