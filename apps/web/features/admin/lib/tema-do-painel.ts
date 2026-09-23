import { THEME_COOKIE, type ThemePreference } from "@/features/guest/lib/theme-preference";

/**
 * O painel reusa o cookie e a cascata do lado do convidado. Uma pessoa, uma
 * preferência: quem escolhe escuro para trabalhar não quer claro ao abrir a
 * prévia do convidado no mesmo navegador.
 */

export const ADMIN_ROOT_ID = "admin-root";
export const ADMIN_TEMA_CLASSE = "admin-tema";

export type EscolhaDeTema = ThemePreference | "system";

const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

export function escolhaDoDataset(tema: string | undefined): EscolhaDeTema {
  return tema === "light" || tema === "dark" ? tema : "system";
}

export function cookieParaEscolha(escolha: EscolhaDeTema): string {
  if (escolha === "system") {
    return `${THEME_COOKIE}=; path=/; max-age=0; SameSite=Lax; Secure`;
  }
  return `${THEME_COOKIE}=${escolha}; path=/; max-age=${UM_ANO_EM_SEGUNDOS}; SameSite=Lax; Secure`;
}
