import { readThemePreference, THEME_COOKIE, type ThemePreference } from "./theme-preference";

export const GUEST_ROOT_ID = "guest-root";

const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

/** Terceira opção além de "light"/"dark": representada pela AUSÊNCIA do cookie — nunca acumula valor fora do conjunto fechado. */
export type GuestThemeChoice = ThemePreference | "system";

/** Lê `data-tema` do container — mesmo conjunto fechado do cookie no servidor, as duas pontas nunca divergem sobre "sem override". */
export function escolhaDoDataset(tema: string | undefined): GuestThemeChoice {
  return readThemePreference(tema) ?? "system";
}

/** "system" apaga o cookie (`max-age=0`) — sem ele a cascata do anti-flash volta à media query, como antes de qualquer escolha explícita. */
export function cookieParaEscolha(escolha: GuestThemeChoice): string {
  if (escolha === "system") {
    return `${THEME_COOKIE}=; path=/; max-age=0; SameSite=Lax; Secure`;
  }
  return `${THEME_COOKIE}=${escolha}; path=/; max-age=${UM_ANO_EM_SEGUNDOS}; SameSite=Lax; Secure`;
}
