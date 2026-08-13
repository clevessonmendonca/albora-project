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
export type Colors = {
  papel: string;
  tinta: string;
  noite: string;
  /** Âmbar. Acento único, usado com parcimônia. */
  acento: string;
  /** Brasa. Acento raro — erro e destaque crítico. */
  critico: string;
};

export type Fonts = {
  titulo: string;
  corpo: string;
};

export type Scale = {
  /** O raio padrão. Card, campo, botão retangular. */
  raio: string;
  /**
   * Pílula. É a forma dominante da identidade — na landing dos designers ela
   * aparece 22 vezes contra 6 do raio de card. Botão, chip e selo usam esta.
   */
  raioPilula: string;
  /**
   * Superfície grande. Cresce com a tela: num celular um raio de 48px comeria
   * a foto, e num telão um de 28px some.
   */
  raioSuperficie: string;
  espaco: string;
};

/**
 * Uma curva, três durações. A landing usa exatamente isso, e é o que faz o
 * conjunto parecer uma coisa só em vez de nove animações independentes.
 */
export type Motion = {
  curva: string;
  rapido: string;
  medio: string;
  lento: string;
};

/**
 * Tracking muda de sinal com o tamanho: título grande fecha, rótulo pequeno
 * abre. É a diferença entre tipografia ajustada e tipografia padrão do
 * navegador — e ela aparece antes de qualquer outra coisa.
 */
export type Tracking = {
  titulo: string;
  rotulo: string;
};

export type Background = "escuro" | "claro";

export type Tokens = {
  cores: Colors;
  fontes: Fonts;
  escala: Scale;
  movimento: Motion;
  tracking: Tracking;
  fundo: Background;
};

/**
 * O que os componentes de fato consomem.
 *
 * Existe para que nenhuma tela precise decidir "quanto de opacidade num texto
 * secundário" — essa decisão é do sistema, e tomada uma vez. Componente que
 * escolhe o próprio neutro é o mesmo defeito que componente com hex literal,
 * só que invisível para o guard.
 */
export type SemanticScale = {
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
  /**
   * Rótulo **sobre** o preenchimento de acento. É o outro lado de
   * `acentoTexto`, e não é o `bg`: sobre âmbar, papel reprova contraste.
   */
  sobreAcento: string;
  critico: string;
};

/** Camada da cadeia. Cada uma sobrepõe a anterior, campo a campo. */
export type TokenLayer = {
  cores?: Partial<Colors>;
  fontes?: Partial<Fonts>;
  escala?: Partial<Scale>;
  movimento?: Partial<Motion>;
  tracking?: Partial<Tracking>;
  fundo?: Background;
};

export type ResolutionInput = {
  /** A marca Albora. Piso da cadeia, sempre presente. */
  marca: Tokens;
  /** O vertical — casamento, 15 anos, formatura. */
  pack?: TokenLayer;
  /** O evento. Ganha de todo mundo: é a identidade do casal. */
  evento?: TokenLayer;
};
