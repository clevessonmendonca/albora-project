import React, { type ReactNode } from "react";
import { SkipLink } from "@albora/ui-web";
import Link from "next/link";
import { cookies } from "next/headers";
import { estiloAntiFlash } from "@/features/guest/lib/theme-style";
import { readThemePreference, THEME_COOKIE } from "@/features/guest/lib/theme-preference";
import { ADMIN_TEMA_CLASSE } from "@/features/admin/lib/tema-do-painel";
import { adminVars } from "@/features/admin/components/server/admin-shell";
import { MenuDaConta } from "@/features/admin/components/client/menu-da-conta";
import { SignOutButton } from "@/features/admin/components/client/sign-out-button";

type AdminShellProps = {
  title: string;
  subtitle?: string;
  back?: { label: string; href: string };
  /** Cor, fonte e raio do casal. Ausente nas telas sem evento (entrar, erro, 404). */
  identidade?: Record<string, unknown>;
  /** Conta logada. Ausente fora do contexto de um evento — ali sobra só a saída. */
  email?: string;
  children: ReactNode;
};

/**
 * Mora separado de `admin-shell.tsx` porque só ele lê `next/headers`, e aquele
 * arquivo é importado por 36 componentes `"use client"` — o import derruba o build.
 */
export async function AdminShell({ title, subtitle, back, identidade, email, children }: AdminShellProps) {
  const preferencia = readThemePreference((await cookies()).get(THEME_COOKIE)?.value);

  const claro = adminVars("light", identidade) as Record<string, string>;
  const escuro = adminVars("dark", identidade) as Record<string, string>;

  return (
    <>
    <SkipLink />
    <style>{estiloAntiFlash(claro, escuro, `.${ADMIN_TEMA_CLASSE}`)}</style>
    <main
      id="main-content"
      className={`${ADMIN_TEMA_CLASSE} min-h-dvh bg-bg p-[clamp(1.5rem,5vw,4rem)] font-[family-name:var(--fonte-corpo)] text-ink`}
      {...(preferencia ? { "data-tema": preferencia } : {})}
    >
      <header className="mb-10 flex items-start justify-between gap-6" data-admin-shell-header>
        <div>
          {back && (
            <Link
              href={back.href}
              className="mb-3.5 inline-block text-sm tracking-[0.01em] text-ink-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink"
              data-admin-shell-back
            >
              ← {back.label}
            </Link>
          )}
          <h1 className="m-0 font-titulo text-[1.875rem] font-light tracking-titulo">{title}</h1>
          {subtitle && <p className="mt-2 text-[0.9rem] text-ink-3">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {email ? <MenuDaConta email={email} /> : <SignOutButton />}
        </div>
      </header>
      {children}
    </main>
    </>
  );
}
