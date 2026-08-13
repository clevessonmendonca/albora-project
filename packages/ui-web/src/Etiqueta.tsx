import type { ReactNode } from "react";
import { variantes } from "./variantes";

/**
 * A pílula pequena de estado — "847 fotos", "ao vivo", "1 de 4".
 *
 * `acento` é o único tom cheio; o resto é discreto de propósito, porque numa
 * tela cheia de foto a etiqueta informa, não compete com a imagem.
 */
const etiqueta = variantes({
  base: "inline-flex items-center gap-1.5 rounded-pilula px-3 py-1.5 text-[0.78125rem] whitespace-nowrap",
  variantes: {
    tom: {
      neutro: "bg-superficie-alta text-ink-2",
      acento: "bg-acento text-sobre-acento",
      contorno: "border border-linha text-ink-2",
    },
  },
  padrao: { tom: "neutro" },
});

export function Etiqueta({
  tom,
  className,
  children,
}: {
  tom?: "neutro" | "acento" | "contorno";
  className?: string;
  children: ReactNode;
}) {
  return <span className={etiqueta({ tom, className })}>{children}</span>;
}
