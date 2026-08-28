/** Cinco cores — neutros são opacidade sobre `papel`/`noite`, nunca rampa de cinza (que perde temperatura a cada passo); `tinta` é texto, `noite` é chão escuro. */
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
  /** Pílula — forma dominante (22 × landing vs 6 do card); botão, chip e selo usam esta. */
  raioPilula: string;
  /** Superfície grande — cresce com a tela; 48px num celular come a foto, 28px num telão some. */
  raioSuperficie: string;
  /** Mídia — foto e vídeo no card do feed do convidado. */
  raioMedia: string;
  espaco: string;
};

/** Uma curva, três durações — é o que faz o conjunto parecer uma coisa só em vez de nove animações independentes. */
export type Motion = {
  curva: string;
  rapido: string;
  medio: string;
  lento: string;
};

/** Tracking muda de sinal com o tamanho — título grande fecha, rótulo pequeno abre; diferença entre tipografia ajustada e padrão do navegador. */
export type Tracking = {
  titulo: string;
  rotulo: string;
};

export type Background = "dark" | "light";

/** PT aliases still present in stored event `identityTokens`. */
export type BackgroundInput = Background | "escuro" | "claro";

export type Tokens = {
  cores: Colors;
  fontes: Fonts;
  escala: Scale;
  movimento: Motion;
  tracking: Tracking;
  background: Background;
};

/** O que os componentes consomem — nenhum decide "quanto de opacidade no texto secundário"; componente que escolhe o próprio neutro é o mesmo defeito que hex literal, invisível ao guard. */
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
  /** Rótulo sobre preenchimento de acento — não é `bg`: sobre âmbar, papel reprova contraste. */
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
  background?: BackgroundInput;
  /** PT alias — event JSON in the DB still uses `fundo`. */
  fundo?: BackgroundInput;
};

export type ResolutionInput = {
  /** A marca Albora. Piso da cadeia, sempre presente. */
  marca: Tokens;
  /** Fornecedor (B2B2C): só quando `events.vendor_id` existe; entre `marca` e `pack` — perde para o vertical e o evento, ganha do piso Albora. */
  vendor?: TokenLayer;
  /** O vertical — casamento, 15 anos, formatura. */
  pack?: TokenLayer;
  /** O evento. Ganha de todo mundo: é a identidade do casal. */
  evento?: TokenLayer;
};
