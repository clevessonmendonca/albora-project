import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario";
  children: ReactNode;
};

/**
 * Primeira primitiva. Existe na 002 para o guard de tokens ter código real
 * para verificar, não porque alguma tela precise dela.
 *
 * Nenhuma cor aqui: tudo sai de custom property emitida por
 * `@albora/tokens`. Sem ícone dentro do botão, sem tracking — decisões do
 * DESIGN.md que o componente não reabre.
 */
export function Botao({ variante = "primario", children, ...resto }: Props) {
  const base =
    "inline-flex items-center justify-center min-h-[44px] px-4 rounded-[var(--raio)] font-medium";
  const cor =
    variante === "primario"
      ? "bg-[var(--frente)] text-[var(--fundo)]"
      : "bg-transparent text-[var(--frente)] border border-[var(--frente)]/20";

  return (
    <button className={`${base} ${cor}`} {...resto}>
      {children}
    </button>
  );
}
