import React from "react";
import { StatusBadge, type StatusBadgeTone } from "@albora/ui-web";
import { CabecalhoDePainel, Painel, RotuloSerif } from "./console-primitivos";

/**
 * Cabeçalho de detalhe de conta — traduz o `.dh` do protótipo (avatar +
 * nome + selo) pra rota própria: aqui é topo de página, não dreno lateral
 * (o console admin abre detalhe em URL, não em `.detail` deslizante).
 */
export function ContaCabecalho({
  inicial,
  title,
  subtitle,
  id,
  status,
  actions,
}: {
  inicial: string;
  title: string;
  subtitle?: string;
  id: string;
  status: { tone: StatusBadgeTone; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-linha pb-6">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-media bg-ink text-[0.875rem] font-medium text-superficie"
        >
          {inicial}
        </span>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="tipo-den-titulo m-0 text-ink">{title}</h1>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </div>
          <span className="tipo-den-meta font-mono text-ink-3">{id}</span>
          {subtitle && <p className="tipo-den-meta m-0 text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        <div data-testid="entity-header-actions" className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}

export type SecaoDetalheConta = {
  key: string;
  label: string;
  content: React.ReactNode;
  /** Mostrado quando `content` é `null`/`undefined` — nunca "Sem dados". */
  emptyLabel: string;
};

/** Painel com seções chave/valor — o `.dpanel`/`.drow` do protótipo, com os primitivos do console. */
export function PainelDeDetalheConta({ titulo, secoes }: { titulo: string; secoes: SecaoDetalheConta[] }) {
  return (
    <Painel>
      <CabecalhoDePainel titulo={titulo} />
      <div className="flex flex-col px-5">
        {secoes.map((secao) => (
          <div key={secao.key} className="border-b border-linha py-3.5 last:border-b-0">
            <RotuloSerif className="mb-1.5 block">{secao.label}</RotuloSerif>
            <div className="tipo-den-corpo text-ink">
              {secao.content ?? <span className="text-ink-3">{secao.emptyLabel}</span>}
            </div>
          </div>
        ))}
      </div>
    </Painel>
  );
}
