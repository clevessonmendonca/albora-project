import React, { type ReactNode } from "react";
import { cookies } from "next/headers";
import { SkipLink, ToastContainer } from "@albora/ui-web";
import { estiloAntiFlash } from "@/features/guest/lib/theme-style";
import { readThemePreference, THEME_COOKIE } from "@/features/guest/lib/theme-preference";
import { ADMIN_ROOT_ID, ADMIN_TEMA_CLASSE } from "@/features/admin/lib/tema-do-painel";
import { adminVars } from "@/features/admin/lib/chrome-do-painel";

/** A raiz temática do painel: o anti-flash e as vars ficam num lugar só, e as duas cascas (evento e avulsa) herdam daqui. */
export async function RaizDoPainel({ children }: { children: ReactNode }) {
  const preferencia = readThemePreference((await cookies()).get(THEME_COOKIE)?.value);

  // Vars da marca, não do casal: nada aqui vem de dado de terceiro, então não passa pelo saneador.
  const claro = adminVars("light") as Record<string, string>;
  const escuro = adminVars("dark") as Record<string, string>;

  return (
    <>
      <SkipLink />
      <style>{estiloAntiFlash(claro, escuro, `.${ADMIN_TEMA_CLASSE}`)}</style>
      <div
        id={ADMIN_ROOT_ID}
        className={`${ADMIN_TEMA_CLASSE} min-h-dvh bg-bg font-[family-name:var(--fonte-corpo)] text-ink`}
        {...(preferencia ? { "data-tema": preferencia } : {})}
      >
        {children}
      </div>
      <ToastContainer />
    </>
  );
}
