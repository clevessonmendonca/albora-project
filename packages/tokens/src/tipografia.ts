export type PapelDeTipo =
  | "display" | "title" | "subtitle" | "bodyLg" | "body" | "caption" | "label";

export type EstiloDeTipo = {
  tamanho: string;
  peso: number;
  entrelinha: number;
  tracking: string;
  fonte: "titulo" | "corpo";
  /** Só o rótulo. Fraunces em caixa baixa some abaixo de 20px; em versalete com tracking largo ela funciona a partir de 8,5px. */
  caixaAlta?: boolean;
};

/**
 * A escala do DESIGN.md §3. Display em razão 1,24 — dramática, poucos passos;
 * texto em 1,13 — fina, para hierarquia sutil.
 *
 * O peso registrado aqui é o das superfícies de leitura (landing, admin): 300,
 * porque "delicadeza vem de peso baixo em tamanho grande" é a regra que decide
 * se a interface lê chique ou simpática. Convidado e telão sobem para 500 pela
 * variável `--peso-display` na raiz da superfície, não por um papel próprio —
 * a mesma frase em 500 num corpo menor lê robusta e acolhedora, que é o que
 * aquelas telas precisam às 22h.
 */
export const ESCALA_TIPOGRAFICA: Record<PapelDeTipo, EstiloDeTipo> = {
  display:  { tamanho: "clamp(2.25rem, 6vw, 4.375rem)",    peso: 300, entrelinha: 1.10, tracking: "-0.014em", fonte: "titulo" },
  title:    { tamanho: "clamp(1.8125rem, 4vw, 2.875rem)",  peso: 300, entrelinha: 1.16, tracking: "-0.012em", fonte: "titulo" },
  subtitle: { tamanho: "1.8125rem",                        peso: 300, entrelinha: 1.17, tracking: "-0.012em", fonte: "titulo" },
  bodyLg:   { tamanho: "1.125rem",                         peso: 400, entrelinha: 1.72, tracking: "0",        fonte: "corpo" },
  body:     { tamanho: "1.03125rem",                       peso: 400, entrelinha: 1.68, tracking: "0",        fonte: "corpo" },
  caption:  { tamanho: "0.875rem",                         peso: 400, entrelinha: 1.68, tracking: "0",        fonte: "corpo" },
  label:    { tamanho: "0.6875rem",                        peso: 400, entrelinha: 1.30, tracking: "0.28em",   fonte: "titulo", caixaAlta: true },
};

/** English alias. */
export const TYPE_SCALE = ESCALA_TIPOGRAFICA;
