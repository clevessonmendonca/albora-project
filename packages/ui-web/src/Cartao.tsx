import type { ReactNode } from "react";
import { cn } from "./variantes";

/**
 * A superfície do card — o papel elevado do evento.
 *
 * `destacado` puxa o âmbar do casal para dentro do fundo (mistura no token, não
 * um cinza fixo), para o card de decisão saltar sem virar caixa colorida.
 */
export function Cartao({
  destacado,
  className,
  children,
}: {
  destacado?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-token p-5",
        destacado ? "bg-acento-superficie" : "bg-superficie",
        className,
      )}
    >
      {children}
    </div>
  );
}
