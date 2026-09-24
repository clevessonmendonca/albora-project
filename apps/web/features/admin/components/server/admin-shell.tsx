import React, { type CSSProperties, type ReactNode } from "react";
import { ALBORA_BRAND, toVariables, resolveTokens, type Background } from "@albora/tokens";
import { buttonVariants, cva } from "@albora/ui-web";

/**
 * Admin nasce claro — a marca resolve `dark` (chão do convidado), então o
 * default aqui sobrescreve.
 *
 * `identidade` é a camada do evento: cor, fonte e raio do casal, que é o que o
 * produto promete propagar. Ela entra SEM o `background` dela, porque no admin
 * o chão é decisão de contexto de uso, não da festa (DESIGN.md §2). Telas sem
 * evento — entrar, erro, 404, console — chamam sem ela e seguem na marca pura.
 */
export function adminVars(
  background: Background = "light",
  identidade?: Record<string, unknown>,
): CSSProperties {
  const camada = identidade && Object.keys(identidade).length > 0 ? identidade : undefined;
  if (!camada) {
    return toVariables(
      resolveTokens({ marca: ALBORA_BRAND, pack: { background } }),
    ) as CSSProperties;
  }

  const { fundo: _fundo, background: _background, ...semFundo } = camada as Record<string, unknown>;

  return toVariables(
    resolveTokens({
      marca: ALBORA_BRAND,
      pack: { background },
      evento: semFundo as never,
    }),
  ) as CSSProperties;
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
  return <section id={id} className={adminCardVariants({ variant, className })}>{children}</section>;
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
