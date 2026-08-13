import type { ButtonHTMLAttributes, ReactNode } from "react";
import { variantes } from "./variantes";

/**
 * Pílula, não retângulo. É a forma dominante da identidade — na landing dos
 * designers ela aparece 22 vezes contra 6 do raio de card.
 *
 * O rótulo do primário sai de `--sobre-acento`, nunca de `--bg`: sobre o âmbar
 * da marca o papel dá 2,6:1 e reprova. Quem decide é o contraste medido, uma
 * vez, para qualquer cor que o casal escolha.
 */
const botao = variantes({
  base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pilula font-medium cursor-pointer transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-55 disabled:pointer-events-none",
  variantes: {
    variante: {
      primario: "bg-acento text-sobre-acento shadow-suave",
      secundario: "bg-transparent text-ink border border-linha",
      fantasma: "bg-transparent text-ink-2 hover:text-ink",
    },
    tamanho: {
      sm: "min-h-9 px-4 text-sm",
      md: "min-h-11 px-6",
      g: "min-h-[3.25rem] px-7 text-[1.0625rem]",
    },
    largura: {
      auto: "",
      cheia: "w-full",
    },
  },
  padrao: { variante: "primario", tamanho: "md", largura: "auto" },
});

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario" | "fantasma";
  tamanho?: "sm" | "md" | "g";
  largura?: "auto" | "cheia";
  children: ReactNode;
};

export function Botao({ variante, tamanho, largura, className, children, ...resto }: Props) {
  return (
    <button className={botao({ variante, tamanho, largura, className })} {...resto}>
      {children}
    </button>
  );
}
