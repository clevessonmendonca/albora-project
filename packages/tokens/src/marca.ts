import type { Tokens } from "./types";

/**
 * O piso da cadeia. Um evento sem identidade nenhuma resolve para isto, e o
 * resultado precisa ser um produto apresentável — não um placeholder.
 *
 * Os valores são os de `brand/LEIA-ME.md` — o pacote de marca é o artefato
 * produzido, e é a ele que os 46 SVGs obedecem. Se divergirem, a placa
 * impressa deixa de combinar com o telão, que é a coerência que o produto
 * vende — e a divergência entra por aqui, não por outro lugar.
 */
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
    // A pilha do sistema fica atrás como rede: se o arquivo não chegar, o
    // texto sai numa sans decente em vez de num serif de fallback.
    corpo: "\"Instrument Sans\", ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
  escala: {
    raio: "1rem",
    raioPilula: "999px",
    // Cresce com a tela: 48px num celular comeria a foto; 28px num telão some.
    raioSuperficie: "clamp(1.75rem, 4vw, 3rem)",
    espaco: "0.25rem",
  },
  movimento: {
    // Uma curva só, em tudo. Nove curvas diferentes é o que faz uma interface
    // parecer nove interfaces.
    curva: "cubic-bezier(0.2, 0, 0, 1)",
    rapido: "0.3s",
    medio: "0.35s",
    lento: "0.5s",
  },
  tracking: {
    titulo: "-0.02em",
    rotulo: "0.05em",
  },
  // Escuro por física, não por estética: tela branca às 22h contrai a pupila e
  // a pessoa perde a festa de vista. Ver `DESIGN.md` §2.
  fundo: "escuro",
};

/** PT alias — prefer `ALBORA_BRAND`. */
export const MARCA_ALBORA = ALBORA_BRAND;
