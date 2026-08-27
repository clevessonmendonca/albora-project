import React, { type CSSProperties, type ReactNode } from "react";
import { ALBORA_BRAND, toVariables, resolveTokens, type Background } from "@albora/tokens";
import { cva } from "@albora/ui-web";
import Link from "next/link";
import { SignOutButton } from "@/features/admin/components/client/sign-out-button";

/**
 * O admin é superfície clara por padrão (DESIGN.md §2: admin é papel, não
 * noite) — a marca resolve para `dark` porque é o chão do convidado, então o
 * default aqui precisa sobrescrever, não herdar.
 */
export function adminVars(background: Background = "light"): CSSProperties {
  return toVariables(
    resolveTokens({ marca: ALBORA_BRAND, pack: { background } }),
  ) as CSSProperties;
}

type AdminShellProps = {
  title: string;
  subtitle?: string;
  back?: { label: string; href: string };
  children: ReactNode;
};

export function AdminShell({ title, subtitle, back, children }: AdminShellProps) {
  return (
    <main
      className="min-h-dvh bg-bg p-[clamp(1.5rem,5vw,4rem)] font-[family-name:var(--fonte-corpo)] text-ink"
      style={adminVars()}
    >
      <header className="mb-10 flex items-start justify-between gap-6">
        <div>
          {back && (
            <Link
              href={back.href}
              className="mb-3.5 inline-block text-sm tracking-[0.01em] text-ink-3 no-underline"
            >
              ← {back.label}
            </Link>
          )}
          <h1 className="m-0 font-titulo text-[1.875rem] font-light tracking-titulo">{title}</h1>
          {subtitle && <p className="mt-2 text-[0.9rem] text-ink-3">{subtitle}</p>}
        </div>
        <SignOutButton />
      </header>
      {children}
    </main>
  );
}

const adminCardVariants = cva({
  base: "rounded-superficie border border-linha p-6",
  variants: {
    variant: {
      default: "bg-superficie shadow-suave",
      highlight: "bg-gradient-chao-quente shadow-alta",
    },
  },
  defaultVariants: { variant: "default" },
});

export function AdminCard({
  variant,
  children,
  className,
}: {
  variant?: "default" | "highlight";
  children: ReactNode;
  className?: string;
}) {
  return <section className={adminCardVariants({ variant, className })}>{children}</section>;
}

/** Alias de `AdminCard` variant default — migração dos consumidores é outra task. */
export function AdminSection({ children }: { children: ReactNode }) {
  return <AdminCard>{children}</AdminCard>;
}

export const adminClasses = {
  primaryButton:
    "inline-block cursor-pointer border-none bg-acento px-[1.4rem] py-3 font-titulo text-base text-sobre-acento no-underline rounded-pilula transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80",
  dangerButton:
    "w-full cursor-pointer border-none bg-critico px-5 py-4 font-titulo text-[1.0625rem] text-sobre-acento rounded-pilula transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80",
  primaryButtonSm:
    "inline-block cursor-pointer border-none bg-acento px-3 py-[0.45rem] font-titulo text-[0.8125rem] text-sobre-acento no-underline rounded-pilula transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80",
  dangerButtonSm:
    "inline-block w-auto cursor-pointer border-none bg-critico px-3 py-[0.45rem] font-titulo text-[0.8125rem] text-sobre-acento rounded-pilula transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80",
  secondaryButton:
    "inline-block cursor-pointer border border-linha bg-superficie-alta px-[1.4rem] py-3 font-titulo text-base text-ink no-underline rounded-pilula transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto",
  listLink: "block border-b border-linha py-4 text-ink no-underline",
} as const;
