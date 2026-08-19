import { readThemePreference, THEME_COOKIE, type ThemePreference } from "./theme-preference";

export const GUEST_ROOT_ID = "guest-root";

const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

/**
 * A terceira opção do convidado, além de "light"/"dark": deixar a media
 * query do sistema decidir. Não tem valor de cookie próprio — é representada
 * pela AUSÊNCIA do cookie, então o cookie nunca acumula um terceiro valor
 * fora do conjunto fechado que `readThemePreference` aceita.
 */
export type GuestThemeChoice = ThemePreference | "system";

/**
 * A escolha do convidado a partir do `data-tema` já aplicado ao container
 * (`#guest-root`) — mesmo conjunto fechado da leitura do cookie no servidor,
 * então as duas pontas nunca divergem sobre o que "sem override" significa.
 */
export function escolhaDoDataset(tema: string | undefined): GuestThemeChoice {
  return readThemePreference(tema) ?? "system";
}

/**
 * String pronta para `document.cookie =`. "system" apaga o cookie
 * (`max-age=0`, sem valor) — sem ele, a cascata do `<style>` anti-flash do
 * layout volta a decidir pela media query, exatamente como antes de
 * qualquer escolha explícita do convidado.
 */
export function cookieParaEscolha(escolha: GuestThemeChoice): string {
  if (escolha === "system") {
    return `${THEME_COOKIE}=; path=/; max-age=0; SameSite=Lax; Secure`;
  }
  return `${THEME_COOKIE}=${escolha}; path=/; max-age=${UM_ANO_EM_SEGUNDOS}; SameSite=Lax; Secure`;
}
