import type { ReactNode } from "react";
import { StatusBadge, type StatusBadgeTone } from "./status-badge";

export type EntityHeaderStatus = { tone: StatusBadgeTone; label: string };

/**
 * Cabeçalho de tela de detalhe: identidade, status e ações permitidas ao
 * ator — quem não tem a capacidade simplesmente não recebe `actions`, o
 * componente não decide permissão (ADR 0016 §5.5).
 */
export function EntityHeader({
  title,
  subtitle,
  status,
  actions,
}: {
  title: string;
  subtitle?: string;
  status: EntityHeaderStatus;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-linha pb-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="tipo-den-titulo m-0">{title}</h1>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>
        {subtitle && <p className="tipo-den-corpo m-0 text-ink-3">{subtitle}</p>}
      </div>
      {actions && (
        <div data-testid="entity-header-actions" className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
