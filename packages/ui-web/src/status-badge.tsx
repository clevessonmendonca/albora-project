import type { ReactNode } from "react";
import { cva } from "./variants";

export type StatusBadgeTone = "neutral" | "positive" | "atencao" | "critico";

const statusBadgeVariants = cva({
  base: "inline-flex items-center gap-1.5 rounded-pilula px-3 py-1.5 text-[0.78125rem] whitespace-nowrap",
  variants: {
    tone: {
      neutral: "bg-superficie-alta text-ink-2",
      positive: "border border-acento bg-acento/10 text-acento-texto",
      atencao: "border border-linha bg-superficie-alta text-ink",
      critico: "border border-critico bg-critico/10 text-critico",
    },
  },
  defaultVariants: { tone: "neutral" },
});

/**
 * Selo de status com tom neutro/positivo/atenção/crítico via token.
 *
 * A cor é reforço, nunca o único portador de significado — o texto
 * (`children`) é obrigatório e sempre renderiza, mesmo para quem não
 * distingue as cores entre si.
 */
export function StatusBadge({ tone, children }: { tone?: StatusBadgeTone; children: ReactNode }) {
  return <span className={statusBadgeVariants({ tone })}>{children}</span>;
}
