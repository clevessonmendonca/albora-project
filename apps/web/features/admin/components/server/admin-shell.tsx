import React, { type CSSProperties, type ReactNode } from "react";
import { ALBORA_BRAND, toVariables, resolveTokens, type Background } from "@albora/tokens";
import { buttonVariants, cva, SkipLink } from "@albora/ui-web";
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
      className="min-h-dvh bg-bg font-[family-name:var(--fonte-corpo)] text-ink"
      style={adminVars()}
    >
      {/* Coluna única de leitura confortável — o chão continua de ponta a ponta, o conteúdo não. */}
      <div className="mx-auto w-full max-w-[72rem] p-[clamp(1.5rem,5vw,4rem)]">
        <header className="mb-12 flex items-start justify-between gap-6" data-admin-shell-header>
          <div>
            {back && (
              <Link
                href={back.href}
                data-admin-shell-back
                className="tipo-label mb-4 inline-block text-ink-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink"
              >
                ← {back.label}
              </Link>
            )}
            <h1 className="tipo-title m-0">{title}</h1>
            {subtitle && <p className="tipo-caption m-0 mt-2 text-ink-3">{subtitle}</p>}
          </div>
          <SignOutButton />
        </header>
        {children}
      </div>
    </main>
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

/**
 * Ponte para o Design System. Eram strings próprias que divergiam do
 * `@albora/ui-web` — agora cada rótulo é só um preset de `buttonVariants`, então
 * botão de admin e botão de produto têm o mesmo traço por construção.
 * Preferir `Button` em `<button>`; estes rótulos servem `<a>`/`<Link>`.
 */
export const adminClasses = {
  primaryButton: buttonVariants({ variant: "primary", size: "md" }),
  primaryButtonSm: buttonVariants({ variant: "primary", size: "sm" }),
  secondaryButton: buttonVariants({ variant: "secondary", size: "md" }),
  dangerButton: buttonVariants({ variant: "danger", size: "lg", width: "full" }),
  dangerButtonSm: buttonVariants({ variant: "danger", size: "sm" }),
  listLink:
    "block border-b border-linha py-4 text-ink no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-acento-texto",
} as const;
