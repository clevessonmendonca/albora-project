import type { ReactNode } from "react";

/**
 * Estado vazio genérico de página de console (título, descrição, ação
 * opcional). Nomeado `ConsoleEmptyState` — `EmptyState` já é o estado vazio
 * do convidado em `guest-chrome.tsx` (CTA de câmera, texto de convite), com
 * propósito e props diferentes; um segundo `EmptyState` no mesmo barrel
 * colidiria e quebraria quem já importa o do convidado.
 */
export function ConsoleEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h2 className="tipo-den-titulo m-0">{title}</h2>
      {description && <p className="tipo-den-corpo m-0 max-w-[32rem] text-ink-3">{description}</p>}
      {action}
    </div>
  );
}
