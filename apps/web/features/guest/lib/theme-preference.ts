export const THEME_COOKIE = "albora_tema";

export type ThemePreference = "light" | "dark";

const VALORES_VALIDOS = new Set<ThemePreference>(["light", "dark"]);

/** Cookie é dado de terceiro: conjunto fechado "light"/"dark" — qualquer outro valor volta `null` ("sem preferência salva"). */
export function readThemePreference(cookieValue: string | undefined): ThemePreference | null {
  if (cookieValue === undefined) return null;
  return VALORES_VALIDOS.has(cookieValue as ThemePreference) ? (cookieValue as ThemePreference) : null;
}
