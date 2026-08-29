import type { HTMLAttributes, ReactNode } from "react";
import { cva } from "./variants";

const badgeVariants = cva({
  base: "inline-flex items-center gap-1.5 rounded-pilula px-3 py-1.5 text-[0.78125rem] whitespace-nowrap",
  variants: {
    tone: {
      neutral: "bg-superficie-alta text-ink-2",
      accent: "bg-acento text-sobre-acento",
      outline: "border border-linha text-ink-2",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({
  tone,
  className,
  children,
  ...rest
}: {
  tone?: "neutral" | "accent" | "outline";
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLSpanElement>, "className">) {
  return (
    <span className={badgeVariants({ tone, className })} {...rest}>
      {children}
    </span>
  );
}
