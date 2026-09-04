export type PapelDeTipo =
  | "display" | "title" | "subtitle" | "bodyLg" | "body" | "caption" | "label";

export type EstiloDeTipo = {
  tamanho: string;
  peso: number;
  entrelinha: number;
  tracking: string;
  fonte: "titulo" | "corpo";
};

export const ESCALA_TIPOGRAFICA: Record<PapelDeTipo, EstiloDeTipo> = {
  display:  { tamanho: "clamp(2.5rem, 6vw, 4rem)",    peso: 400, entrelinha: 1.05, tracking: "-0.02em",  fonte: "titulo" },
  title:    { tamanho: "clamp(1.75rem, 4vw, 2.5rem)", peso: 400, entrelinha: 1.1,  tracking: "-0.015em", fonte: "titulo" },
  subtitle: { tamanho: "1.25rem",                     peso: 500, entrelinha: 1.25, tracking: "-0.01em",  fonte: "titulo" },
  bodyLg:   { tamanho: "1.125rem",                    peso: 400, entrelinha: 1.55, tracking: "0",        fonte: "corpo" },
  body:     { tamanho: "1rem",                        peso: 400, entrelinha: 1.55, tracking: "0",        fonte: "corpo" },
  caption:  { tamanho: "0.875rem",                    peso: 400, entrelinha: 1.45, tracking: "0",        fonte: "corpo" },
  label:    { tamanho: "0.75rem",                     peso: 500, entrelinha: 1.2,  tracking: "0.05em",   fonte: "corpo" },
};

/** English alias. */
export const TYPE_SCALE = ESCALA_TIPOGRAFICA;
