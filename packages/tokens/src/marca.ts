import type { Tokens } from "./types";

/** Piso da cadeia (brand/LEIA-ME.md) — os 46 SVGs obedecem a este artefato; divergência aqui faz a placa não combinar com o telão. */
export const ALBORA_BRAND: Tokens = {
  cores: {
    papel: "#FCFBF9",
    // Preto quente, nunca #000: preto puro sobre foto de festa vira buraco.
    tinta: "#171513",
    noite: "#0C0A09",
    acento: "#D46632",
    critico: "#BB3D18",
    atencao: "#A96F18",
    positivo: "#28744E",
    informativo: "#3265B5",
  },
  fontes: {
    titulo: "Fraunces, Georgia, serif",
    // A pilha do sistema fica atrás como rede: se o arquivo não chegar, o texto sai numa sans decente em vez de num serif de fallback.
    corpo: "\"Instrument Sans\", ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
  escala: {
    raio: "1rem",
    raioPilula: "999px",
    // Cresce com a tela: 48px num celular comeria a foto; 28px num telão some.
    /**
     * §4: 18px em superfície. Era `clamp(1.75rem, 4vw, 3rem)` — 28px num
     * celular, 48px num desktop largo, mudando com a viewport. O mesmo cartão
     * tinha forma diferente conforme a janela, e 48px é raio de widget de
     * celular, não de papel editorial: o oposto do "hot stamp sobre papel" que
     * a marca persegue. Mídia continua em `raioMedia`, que é onde a curva
     * maior tem função.
     */
    raioSuperficie: "18px",
    raioMedia: "20px",
    espaco: "0.25rem",
  },
  movimento: {
    // Uma curva só, em tudo — nove curvas diferentes é o que faz uma interface parecer nove interfaces.
    curva: "cubic-bezier(0.2, 0, 0, 1)",
    mola: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    saida: "cubic-bezier(0.4, 0, 1, 1)",
    instantaneo: "0.15s",
    rapido: "0.3s",
    medio: "0.35s",
    lento: "0.5s",
  },
  tracking: {
    titulo: "-0.02em",
    rotulo: "0.05em",
  },
  // Escuro por física, não por estética: tela branca às 22h contrai a pupila e a pessoa perde a festa de vista — ver `DESIGN.md` §2.
  background: "dark",
};

/** PT alias — prefer `ALBORA_BRAND`. */
export const MARCA_ALBORA = ALBORA_BRAND;

/**
 * O degradê do arco do logotipo, do pack em `brand/`. Fica aqui, e não no
 * componente, porque é cor de MARCA: não cede à identidade do casal (§2 trata
 * as cores da marca como fixas), então não pode sair de `var(--acento)` — e
 * hex solto em componente é exatamente o que o guard de tokens existe para
 * impedir.
 */
export const DEGRADE_DA_MARCA = {
  base: "#853624",
  meio: ALBORA_BRAND.cores.critico,
  topo: ALBORA_BRAND.cores.acento,
} as const;
