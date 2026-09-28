import React, { type ReactNode } from "react";
import { cva } from "@albora/ui-web";

/**
 * Cartão e lista do painel. Ficam fora de `admin-shell` porque componente
 * client consome os dois, e `admin-shell` importa `next/headers` — juntos, o
 * bundler puxa a casca de servidor para dentro do cliente e a build quebra.
 */
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
