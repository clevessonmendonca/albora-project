"use client";

import { cn } from "@albora/ui-web";
import type { PeriodoTemporal } from "../../hooks/use-temporal-filter";

type TemporalFilterProps = {
  periodo: PeriodoTemporal;
  onSelect: (periodo: PeriodoTemporal) => void;
  contagem?: number;
};

type Opcao = {
  valor: PeriodoTemporal;
  rotulo: string;
};

const OPCOES: readonly Opcao[] = [
  { valor: "hoje", rotulo: "Hoje" },
  { valor: "ontem", rotulo: "Ontem" },
  { valor: "semana", rotulo: "Esta semana" },
  { valor: "tudo", rotulo: "Tudo" },
] as const;

export function TemporalFilter({ periodo, onSelect, contagem }: TemporalFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filtro por período"
      className="mx-[calc(var(--espaco)*-5)] mb-[calc(var(--espaco)*3)] mt-[calc(var(--espaco)*2)] flex items-center gap-[calc(var(--espaco)*6)] overflow-x-auto border-b border-linha px-[calc(var(--espaco)*5)] py-3 [scrollbar-width:none]"
    >
      {OPCOES.map((opcao) => (
        <FilterTab
          key={opcao.valor}
          active={periodo === opcao.valor}
          onClick={() => onSelect(opcao.valor)}
        >
          {opcao.rotulo}
        </FilterTab>
      ))}

      {contagem !== undefined && periodo !== "tudo" && (
        <div className="ml-auto flex-none">
          <span className="inline-flex items-center rounded-full border border-linha bg-transparent px-3 py-1 font-titulo text-[0.68rem] font-normal uppercase tracking-[0.2em] text-ink-2">
            {contagem} {contagem === 1 ? "foto" : "fotos"}
          </span>
        </div>
      )}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "max-w-56 min-h-12 flex-none cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap border-none bg-transparent p-0 font-titulo text-[0.68rem] font-normal uppercase tracking-[0.2em]",
        "[transition:color_var(--tempo-rapido)_var(--curva)]",
        active
          ? "border-b border-b-acento text-ink"
          : "border-b border-b-transparent text-ink-3 hover:text-ink-2",
      )}
    >
      {children}
    </button>
  );
}
