export const THEME_COOKIE = "albora_tema";

export type ThemePreference = "light" | "dark";

const VALORES_VALIDOS = new Set<ThemePreference>(["light", "dark"]);

/**
 * O cookie não é instrução — é dado de terceiro (o navegador do convidado).
 * Conjunto fechado: qualquer valor fora de "light"/"dark" volta `null`, que o
 * chamador trata como "sem preferência salva" (o sistema decide).
 */
export function readThemePreference(cookieValue: string | undefined): ThemePreference | null {
  if (cookieValue === undefined) return null;
  return VALORES_VALIDOS.has(cookieValue as ThemePreference) ? (cookieValue as ThemePreference) : null;
}
