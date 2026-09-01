import type { Tokens } from "./types";

/** Piso da cadeia (brand/LEIA-ME.md) — os 46 SVGs obedecem a este artefato; divergência aqui faz a placa não combinar com o telão. */
export const ALBORA_BRAND: Tokens = {
  cores: {
    papel: "#F4F0E9",
    // Preto quente, nunca #000: preto puro sobre foto de festa vira buraco.
    tinta: "#1A1613",
    noite: "#0C0A09",
    acento: "#D9793C",
    critico: "#C2410C",
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
    raioSuperficie: "clamp(1.75rem, 4vw, 3rem)",
    raioMedia: "20px",
    espaco: "0.25rem",
  },
  movimento: {
    // Uma curva só, em tudo — nove curvas diferentes é o que faz uma interface parecer nove interfaces.
    curva: "cubic-bezier(0.2, 0, 0, 1)",
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
