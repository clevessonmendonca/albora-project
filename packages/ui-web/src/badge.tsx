import type { ReactNode } from "react";
import { cva } from "./variants";

const badgeVariants = cva({
  base: "inline-flex items-center gap-1.5 rounded-pilula px-3 py-1.5 text-[0.78125rem] whitespace-nowrap",
  variants: {
    tone: {
      neutral: "bg-superficie-alta text-ink-2",
      accent: "bg-acento text-sobre-acento",
      outline: "border border-linha text-ink-2",
      /** Estado crítico/bloqueado — semântica separada do acento (pausado, fechado, alerta). */
      critico: "border border-critico bg-critico/10 text-critico",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({
  tone,
  className,
  children,
}: {
  tone?: "neutral" | "accent" | "outline" | "critico";
  className?: string;
  children: ReactNode;
}) {
  return <span className={badgeVariants({ tone, className })}>{children}</span>;
}
