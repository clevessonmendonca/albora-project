/** Saneador de CSS vars do evento: dado do casal é terceiro; valor suspeito (`};@import`) fecha bloco e injeta seletor — fail-closed, cai na marca, nunca ausente. */
const PADRAO_INSEGURO = /[;{}<>\\@]|url\(|\/\*|\*\/|expression\(/i;

export function valorCssSeguro(valor: string): boolean {
  return !PADRAO_INSEGURO.test(valor);
}

/** Cada var passa pelo filtro; insegura cai no fallback da marca — nunca some. */
export function sanearVars(
  vars: Record<string, string>,
  fallback: Record<string, string>,
): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(vars)) {
    resultado[chave] = valorCssSeguro(valor) ? valor : fallback[chave] ?? "";
  }
  return resultado;
}

export function cssDasVars(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([propriedade, valor]) => `${propriedade}: ${valor};`)
    .join(" ");
}

/**
 * Cascata theme-aware, com o **piso** de cada superfície.
 *
 * `padrao: "light"` (painel) — sem escolha, segue o sistema: claro por base,
 * escuro sob `prefers-color-scheme`.
 *
 * `padrao: "dark"` (convidado) — sem escolha, **escuro sempre**, e não segue o
 * sistema. O escuro ali não é preferência, é contexto de uso: a festa é à
 * noite, e um celular configurado em claro não muda isso. Só escolha explícita
 * da pessoa troca o chão.
 *
 * Espera vars já saneadas — só serializa a cascata.
 */
export function estiloAntiFlash(
  claro: Record<string, string>,
  escuro: Record<string, string>,
  escopo = ".guest-tema",
  padrao: "light" | "dark" = "light",
): string {
  const claroCss = cssDasVars(claro);
  const escuroCss = cssDasVars(escuro);

  if (padrao === "dark") {
    return [
      `${escopo}:not([data-tema="light"]) { ${escuroCss} }`,
      `${escopo}[data-tema="light"] { ${claroCss} }`,
    ].join("\n");
  }

  return [
    `${escopo}:not([data-tema="dark"]) { ${claroCss} }`,
    `@media (prefers-color-scheme: dark) { ${escopo}:not([data-tema="light"]) { ${escuroCss} } }`,
    `${escopo}[data-tema="light"] { ${claroCss} }`,
    `${escopo}[data-tema="dark"] { ${escuroCss} }`,
  ].join("\n");
}
