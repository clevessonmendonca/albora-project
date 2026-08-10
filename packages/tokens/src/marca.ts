import type { Tokens } from "./tipos";

/**
 * O piso da cadeia. Um evento sem identidade nenhuma resolve para isto,
 * e o resultado precisa ser um produto apresentável — não um placeholder.
 */
export const MARCA_ALBORA: Tokens = {
  cores: {
    tinta: "#16110D",
    papel: "#F2EAE1",
    acento: "#E8873A",
    // O mesmo âmbar sobre papel não alcança contraste de texto.
    // Re-derivado, não clareado: é a mesma cor com luminância de leitura.
    acentoSobreClaro: "#A34F16",
    realce: "#8FCB9B",
  },
  fontes: {
    titulo: "Fraunces, Georgia, serif",
    corpo: "ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
  escala: {
    raio: "0.6rem",
    espaco: "0.25rem",
  },
  fundo: "escuro",
};
