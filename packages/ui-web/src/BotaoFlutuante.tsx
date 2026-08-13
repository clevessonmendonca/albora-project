import type { ReactNode } from "react";

/**
 * Botão redondo sobre a foto do topo — voltar, mais, compartilhar.
 *
 * O fundo é o chão do evento em 72% sobre a foto (`color-mix` no token, não um
 * cinza fixo), para o ícone ler sobre qualquer imagem sem virar bolha opaca.
 */
export function BotaoFlutuante({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-9 place-items-center rounded-full bg-bg-vidro text-ink backdrop-blur-sm">
      {children}
    </span>
  );
}
