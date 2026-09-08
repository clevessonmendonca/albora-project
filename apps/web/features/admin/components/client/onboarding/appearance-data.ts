import type { TokenLayer } from "@albora/tokens";
import {
  EVENT_COLOR_COMBOS,
  SUGGESTED_EVENT_COLORS,
  type EventColorCombo,
} from "@albora/tokens";

// Reexporta os dados de paleta (fonte: @albora/tokens, onde hex é permitido) sob os nomes
// que os componentes de onboarding usam. Zero hex literal aqui.
export type ColorCombo = EventColorCombo;
export const COLOR_COMBOS = EVENT_COLOR_COMBOS;
export const SUGGESTED_COLORS = SUGGESTED_EVENT_COLORS;

/** Um estilo é lida-pelo-resultado: layout da capa + tipografia + um par de cor que já combina.
 *  `camada` alimenta o resolvedor de tokens (fontes/escala/tracking/fundo) — o mesmo que o casal
 *  sobrescreve depois. `layout` escolhe a diagramação da capa no preview e na impressão. */
export type EventStyle = {
  chave: "editorial" | "minimal" | "contempo" | "fotografico" | "classic";
  nome: string;
  descricao: string;
  comboIndex: number;
  camada: TokenLayer;
};

const SERIF = "Fraunces, Georgia, serif";
const SANS = "\"Instrument Sans\", ui-sans-serif, system-ui, -apple-system, sans-serif";

export const EVENT_STYLES: readonly EventStyle[] = [
  {
    chave: "editorial",
    nome: "Editorial",
    descricao: "Elegante e marcante",
    comboIndex: 0,
    camada: {
      fontes: { titulo: SERIF },
      escala: { raio: "0.25rem" },
      tracking: { titulo: "-0.02em", rotulo: "0.1em" },
      background: "dark",
    },
  },
  {
    chave: "minimal",
    nome: "Minimal",
    descricao: "Leve e discreto",
    comboIndex: 3,
    camada: {
      fontes: { titulo: SANS },
      escala: { raio: "0.125rem" },
      tracking: { titulo: "-0.01em", rotulo: "0.12em" },
      background: "light",
    },
  },
  {
    chave: "contempo",
    nome: "Contemporâneo",
    descricao: "Moderno e expressivo",
    comboIndex: 5,
    camada: {
      fontes: { titulo: SANS },
      escala: { raio: "1.125rem" },
      tracking: { titulo: "-0.03em", rotulo: "0.04em" },
      background: "dark",
    },
  },
  {
    chave: "fotografico",
    nome: "Fotográfico",
    descricao: "Foco nas fotos",
    comboIndex: 1,
    camada: {
      fontes: { titulo: SERIF },
      escala: { raio: "0.75rem" },
      tracking: { titulo: "-0.02em", rotulo: "0.06em" },
      background: "dark",
    },
  },
  {
    chave: "classic",
    nome: "Clássico",
    descricao: "Romântico e atemporal",
    comboIndex: 4,
    camada: {
      fontes: { titulo: SERIF },
      escala: { raio: "var(--raio-pilula)" },
      tracking: { titulo: "-0.02em", rotulo: "0.03em" },
      background: "light",
    },
  },
];
