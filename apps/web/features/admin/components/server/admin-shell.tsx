import React, { type CSSProperties, type ReactNode } from "react";
import { ALBORA_BRAND, toVariables, resolveTokens, type Background } from "@albora/tokens";
import { cva, SkipLink, ToastContainer } from "@albora/ui-web";
import Link from "next/link";
import { cookies } from "next/headers";
import { estiloAntiFlash } from "@/features/guest/lib/theme-style";
import { readThemePreference, THEME_COOKIE } from "@/features/guest/lib/theme-preference";
import {
  ADMIN_ROOT_ID,
  ADMIN_TEMA_CLASSE,
} from "@/features/admin/lib/tema-do-painel";
import { AjudaDoPainel } from "@/features/admin/components/client/ajuda-do-painel";
import { TemaDoPainelToggle } from "@/features/admin/components/client/tema-do-painel-toggle";
import { SignOutButton } from "@/features/admin/components/client/sign-out-button";

/** Admin nasce claro — a marca resolve `dark` (chão do convidado), então o default aqui sobrescreve. O escuro existe e é escolha de quem trabalha, não da marca. */
export function adminVars(background: Background = "light"): CSSProperties {
  return toVariables(
    resolveTokens({ marca: ALBORA_BRAND, pack: { background } }),
  ) as CSSProperties;
}

type AdminShellProps = {
  title: string;
  subtitle?: string;
  back?: { label: string; href: string };
  sidebar?: ReactNode;
  bottomNav?: ReactNode;
  children: ReactNode;
};

export async function AdminShell({
  title,
  subtitle,
  back,
  sidebar,
  bottomNav,
  children,
}: AdminShellProps) {
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
        className={`${ADMIN_TEMA_CLASSE} flex min-h-dvh bg-bg font-[family-name:var(--fonte-corpo)] text-ink`}
        {...(preferencia ? { "data-tema": preferencia } : {})}
      >
        {sidebar}
        <main id="main-content" className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[72rem] p-[clamp(1.5rem,5vw,4rem)] pb-28 lg:pb-[clamp(1.5rem,5vw,4rem)]">
            <header
              className="mb-12 flex items-start justify-between gap-6"
              data-admin-shell-header
            >
              <div className="min-w-0">
                {back && (
                  <Link
                    href={back.href}
                    data-admin-shell-back
                    className="tipo-label mb-4 inline-block text-ink-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink"
                  >
                    ← {back.label}
                  </Link>
                )}
                <h1 className="tipo-title m-0 truncate" title={title}>
                  {title}
                </h1>
                {subtitle && <p className="tipo-caption m-0 mt-2 text-ink-3">{subtitle}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <TemaDoPainelToggle />
                <AjudaDoPainel />
                <SignOutButton />
              </div>
            </header>
            {children}
          </div>
        </main>
      </div>
      {bottomNav}
      <ToastContainer />
    </>
  );
}

const adminCardVariants = cva({
  base: "rounded-superficie border border-linha p-6",
  variants: {
    variant: {
      default: "elev-1",
      highlight: "bg-gradient-chao-quente shadow-alta",
    },
  },
  defaultVariants: { variant: "default" },
});

export function AdminCard({
  variant,
  children,
  className,
  id,
}: {
  variant?: "default" | "highlight";
  children: ReactNode;
  className?: string;
  id?: string | undefined;
}) {
  return (
    <section id={id} className={adminCardVariants({ variant, className })}>
      {children}
    </section>
  );
}

export function AdminSection({ children, id }: { children: ReactNode; id?: string }) {
  return <AdminCard id={id}>{children}</AdminCard>;
}

export const listLinkClasses =
  "block border-b border-linha py-4 text-ink no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-acento-texto";
