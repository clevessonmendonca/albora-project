/**
 * Serialização segura das CSS vars do evento para o `<style>` anti-flash
 * do convidado.
 *
 * `identityTokens` é dado do casal — vem de formulário do anfitrião, não de
 * código — e a pipeline de tokens devolve o valor original intacto quando
 * ele não é um hex válido (decisão de resiliência visual, não de
 * segurança). Sem este filtro, um valor como
 * `"red} .x{background:url(https://evil/x)"` fecha o bloco de regra,
 * injeta um seletor novo e pode declarar `@import` — um terceiro na rota
 * crítica, proibido. Fail-closed: valor suspeito nunca chega ao `<style>`;
 * cai no valor da marca, nunca fica ausente (var ausente quebra quem a
 * consome).
 */
const PADRAO_INSEGURO = /[;{}<>\\@]|url\(|\/\*|\*\/|expression\(/i;

export function valorCssSeguro(valor: string): boolean {
  return !PADRAO_INSEGURO.test(valor);
}

/**
 * Cada var do evento passa pelo filtro; a insegura cai no valor
 * equivalente do fallback (a marca, resolvida pro mesmo fundo) — nunca
 * some.
 */
export function sanearVars(
  vars: Record<string, string>,
  fallback: Record<string, string>,
): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(vars)) {
    resultado[chave] = valorCssSeguro(valor) ? valor : fallback[chave];
  }
  return resultado;
}

export function cssDasVars(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([propriedade, valor]) => `${propriedade}: ${valor};`)
    .join(" ");
}

/**
 * Os 4 blocos do padrão theme-aware: claro cru, escuro sob media guardado
 * por `:not([data-tema="light"])`, e o override explícito `[data-tema]`
 * ganhando nas duas direções. Espera vars já saneadas por `sanearVars` —
 * este helper só serializa e monta a cascata, não valida.
 */
export function estiloAntiFlash(
  claro: Record<string, string>,
  escuro: Record<string, string>,
): string {
  const claroCss = cssDasVars(claro);
  const escuroCss = cssDasVars(escuro);

  return [
    `.guest-tema:not([data-tema="dark"]) { ${claroCss} }`,
    `@media (prefers-color-scheme: dark) { .guest-tema:not([data-tema="light"]) { ${escuroCss} } }`,
    `.guest-tema[data-tema="light"] { ${claroCss} }`,
    `.guest-tema[data-tema="dark"] { ${escuroCss} }`,
  ].join("\n");
}
