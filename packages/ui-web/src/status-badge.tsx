import type { ReactNode } from "react";
import { cva } from "./variants";

export type StatusBadgeTone = "neutral" | "positive" | "atencao" | "critico" | "informativo";

const statusBadgeVariants = cva({
  base: "inline-flex items-center gap-1.5 rounded-pilula px-3 py-1.5 text-[0.78125rem] whitespace-nowrap",
  variants: {
    tone: {
      neutral: "bg-superficie-alta text-ink-2",
      positive: "border border-positivo-borda bg-positivo-superficie text-positivo",
      atencao: "border border-atencao-borda bg-atencao-superficie text-atencao",
      critico: "border border-critico-borda bg-critico-superficie text-critico",
      informativo: "border border-informativo-borda bg-informativo-superficie text-informativo",
    },
  },
  defaultVariants: { tone: "neutral" },
});

/**
 * Selo de status via token — cada tom tem cor própria desde o v5.
 *
 * Antes, `atencao` era cinza e `positive` reusava o âmbar do acento: três
 * severidades, duas cores, e "precisa de olho" indistinguível de "neutro".
 *
 * A cor é reforço, nunca o único portador de significado — o texto
 * (`children`) é obrigatório e sempre renderiza, mesmo para quem não
 * distingue as cores entre si.
 */
export function StatusBadge({ tone, children }: { tone?: StatusBadgeTone; children: ReactNode }) {
  return <span className={statusBadgeVariants({ tone })}>{children}</span>;
}
