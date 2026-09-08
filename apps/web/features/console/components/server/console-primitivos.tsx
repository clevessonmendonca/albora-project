import React from "react";

/**
 * Primitivos de composição do console v5.
 *
 * A hierarquia vem de borda e composição, não de sombra: `elev-*` levanta
 * cartão sobre foto no produto do convidado, e no console isso vira
 * card-dentro-de-card contra o painel flutuante que já é a moldura.
 */
export function Painel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-media border border-linha bg-superficie ${className}`}>{children}</section>;
}

export function CabecalhoDePainel({
  titulo,
  nota,
  acoes,
}: {
  titulo: string;
  nota?: string;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-3 border-b border-linha px-5 py-4">
      <h2 className="tipo-den-titulo m-0">{titulo}</h2>
      {nota && <span className="tipo-den-meta text-ink-3">{nota}</span>}
      {acoes && <div className="ml-auto flex items-center gap-2">{acoes}</div>}
    </div>
  );
}

/** Rótulo de seção/coluna: serifa em caixa alta, o contraponto do v5 à sans dos dados. */
export function RotuloSerif({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`font-[family-name:var(--fonte-titulo)] text-[0.68rem] uppercase tracking-[0.14em] text-ink-3 ${className}`}
    >
      {children}
    </span>
  );
}

/** Título de tela — o mesmo desenho em toda página do console. */
export function TituloDaTela({ titulo, descricao, acoes }: { titulo: string; descricao?: string; acoes?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-[family-name:var(--fonte-titulo)] text-[clamp(1.6rem,3vw,2.1rem)] font-normal leading-tight tracking-[-0.01em] text-ink">
          {titulo}
        </h1>
        {descricao && <p className="tipo-den-corpo m-0 max-w-[62ch] text-ink-2">{descricao}</p>}
      </div>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </header>
  );
}
