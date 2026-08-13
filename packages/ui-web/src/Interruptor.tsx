"use client";

import { cn } from "./variantes";

/**
 * O interruptor — o gate, os menores, o compartilhamento.
 *
 * Trilha `--acento` quando ligado, `--linha` quando desligado; o botão carrega
 * `shadow-suave` para ler como peça física erguida sobre a trilha. É `role
 * switch` de verdade, não um `div` — teclado e leitor de tela enxergam o
 * estado.
 */
export function Interruptor({
  ligado,
  onChange,
  rotulo,
}: {
  ligado: boolean;
  onChange?: (valor: boolean) => void;
  rotulo?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => onChange?.(!ligado)}
      className={cn(
        "relative inline-flex h-7 w-[3.25rem] shrink-0 items-center rounded-pilula p-0.5 transition-colors duration-200",
        ligado ? "bg-acento" : "bg-linha",
      )}
    >
      <span
        className={cn(
          "size-6 rounded-full bg-superficie-alta shadow-suave transition-transform duration-200",
          ligado ? "translate-x-[1.5rem]" : "translate-x-0",
        )}
      />
    </button>
  );
}
