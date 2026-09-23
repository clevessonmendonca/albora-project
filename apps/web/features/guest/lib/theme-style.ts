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

/** 4 blocos theme-aware: claro, escuro sob media, overrides `[data-tema]` nas duas direções. Espera vars já saneadas — só serializa a cascata. O escopo é parâmetro porque a cascata não é do convidado: o painel do anfitrião usa a mesma, com outra raiz. */
export function estiloAntiFlash(
  claro: Record<string, string>,
  escuro: Record<string, string>,
  escopo = ".guest-tema",
): string {
  const claroCss = cssDasVars(claro);
  const escuroCss = cssDasVars(escuro);

  return [
    `${escopo}:not([data-tema="dark"]) { ${claroCss} }`,
    `@media (prefers-color-scheme: dark) { ${escopo}:not([data-tema="light"]) { ${escuroCss} } }`,
    `${escopo}[data-tema="light"] { ${claroCss} }`,
    `${escopo}[data-tema="dark"] { ${escuroCss} }`,
  ].join("\n");
}
