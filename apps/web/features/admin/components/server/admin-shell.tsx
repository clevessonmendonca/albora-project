import React, { type CSSProperties, type ReactNode } from "react";
import { ALBORA_BRAND, toVariables, resolveTokens, type Background } from "@albora/tokens";
import { cva, SkipLink } from "@albora/ui-web";
import Link from "next/link";
import { SignOutButton } from "@/features/admin/components/client/sign-out-button";

/** Admin é superfície clara — a marca resolve `dark` (chão do convidado), então o default aqui sobrescreve. */
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
    <>
    <SkipLink />
    <main
      id="main-content"
      className="min-h-dvh bg-bg p-[clamp(1.5rem,5vw,4rem)] font-[family-name:var(--fonte-corpo)] text-ink"
      style={adminVars()}
    >
      <header className="mb-10 flex items-start justify-between gap-6" data-admin-shell-header>
        <div>
          {back && (
            <Link
              href={back.href}
              data-admin-shell-back
              className="mb-3.5 inline-block text-sm tracking-[0.01em] text-ink-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink"
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
    </>
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
  listLink: "block border-b border-linha py-4 text-ink no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-acento-texto",
} as const;
