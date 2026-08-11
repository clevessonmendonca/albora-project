import type { Tokens } from "./tipos";

/**
 * O piso da cadeia. Um evento sem identidade nenhuma resolve para isto, e o
 * resultado precisa ser um produto apresentável — não um placeholder.
 *
 * Os valores são os de `brand/LEIA-ME.md` — o pacote de marca é o artefato
 * produzido, e é a ele que os 46 SVGs obedecem. Se divergirem, a placa
 * impressa deixa de combinar com o telão, que é a coerência que o produto
 * vende — e a divergência entra por aqui, não por outro lugar.
 */
export const MARCA_ALBORA: Tokens = {
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
    raio: "0.6rem",
    espaco: "0.25rem",
  },
  // Escuro por física, não por estética: tela branca às 22h contrai a pupila e
  // a pessoa perde a festa de vista. Ver `DESIGN.md` §2.
  fundo: "escuro",
};
