import type { TokenLayer } from "./types";

/** Modelos prontos como `TokenLayer` — mesma camada que o casal sobrescreve no admin (ADR 0003); identidade são cinco decisões (cor, fonte, raio, densidade, tracking), não uma paleta. */
export type ModeloDeIdentidade = {
  id: string;
  nome: string;
  /** O disco da amostra na tira de escolha. */
  amostra: string;
  camada: TokenLayer;
};

export const MODELOS_DE_IDENTIDADE: ModeloDeIdentidade[] = [
  {
    id: "amanhecer",
    nome: "Amanhecer",
    amostra: "#EFA463",
    camada: {
      cores: { noite: "#241C16", acento: "#EFA463" },
      escala: { raio: "1.125rem", espaco: "1.375rem" },
      tracking: { rotulo: "0.04em" },
      background: "dark",
    },
  },
  {
    id: "linho",
    nome: "Linho",
    amostra: "#E8DCC8",
    camada: {
      cores: { papel: "#F4EADD", tinta: "#3B2E23", acento: "#B4571F" },
      escala: { raio: "0.25rem", espaco: "1.625rem" },
      tracking: { rotulo: "0.1em" },
      background: "light",
    },
  },
  {
    id: "meia-noite",
    nome: "Meia-noite",
    amostra: "#2C3554",
    camada: {
      cores: { noite: "#151A2B", papel: "#E7E9F5", acento: "#9AA6E0" },
      // O único modelo sem serifa no título: a diferença entre "Meia-noite" e
      // "Amanhecer" é de voz, não de tom.
      fontes: { titulo: "var(--fonte-corpo)" },
      escala: { raio: "0.125rem", espaco: "1.125rem" },
      tracking: { rotulo: "0.12em" },
      background: "dark",
    },
  },
  {
    id: "jardim",
    nome: "Jardim",
    amostra: "#8FA37A",
    camada: {
      cores: { papel: "#EDF0E4", tinta: "#39422C", acento: "#6E8455" },
      escala: { raio: "var(--raio-pilula)", espaco: "1.875rem" },
      tracking: { rotulo: "0.03em" },
      background: "light",
    },
  },
];
