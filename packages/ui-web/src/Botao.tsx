import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario";
  children: ReactNode;
};

/**
 * Pílula, não retângulo. É a forma dominante da identidade — na landing dos
 * designers ela aparece 22 vezes contra 6 do raio de card.
 *
 * O rótulo do primário sai de `--sobre-acento`, nunca de `--bg`: sobre o âmbar
 * da marca o papel dá 2,6:1 e reprova. Quem decide é o contraste medido, uma
 * vez, para qualquer cor que o casal escolha.
 */
export function Botao({ variante = "primario", children, ...resto }: Props) {
  const base =
    "inline-flex items-center justify-center min-h-[44px] px-6 rounded-[var(--raio-pilula)] font-medium";
  const cor =
    variante === "primario"
      ? "bg-[var(--acento)] text-[var(--sobre-acento)]"
      : "bg-transparent text-[var(--ink)] border border-[var(--linha)]";

  return (
    <button className={`${base} ${cor}`} {...resto}>
      {children}
    </button>
  );
}
