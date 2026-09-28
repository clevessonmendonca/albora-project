import React, { type ReactNode } from "react";
import { cva } from "@albora/ui-web";
import Link from "next/link";
import { RaizDoPainel } from "@/features/admin/components/server/raiz-do-painel";
import { AjudaDoPainel } from "@/features/admin/components/client/ajuda-do-painel";
import { TemaDoPainelToggle } from "@/features/admin/components/client/tema-do-painel-toggle";
import { SignOutButton } from "@/features/admin/components/client/sign-out-button";

type AdminShellProps = {
  /** Omita quando a própria página traz o cabeçalho (`IntroDaPagina` do kit). */
  title?: string;
  subtitle?: string;
  back?: { label: string; href: string };
  children: ReactNode;
};

/** Casca das rotas que não pertencem a um evento (lista, cobrança, fornecedor). O painel do evento usa `EventPageLayout`. */
export async function AdminShell({ title, subtitle, back, children }: AdminShellProps) {
  return (
    <RaizDoPainel>
      <main id="main-content" className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[72rem] p-[clamp(1.5rem,5vw,4rem)]">
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
              {title && (
                <h1 className="tipo-title m-0 truncate" title={title}>
                  {title}
                </h1>
              )}
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
    </RaizDoPainel>
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
