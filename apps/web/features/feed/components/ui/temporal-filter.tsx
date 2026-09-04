"use client";

import { cn } from "@albora/ui-web";
import type { PeriodoTemporal } from "../../hooks/use-temporal-filter";

type TemporalFilterProps = {
  periodo: PeriodoTemporal;
  onSelect: (periodo: PeriodoTemporal) => void;
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

export function TemporalFilter({ periodo, onSelect }: TemporalFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filtro por período"
      className="mx-[calc(var(--espaco)*-5)] mb-[calc(var(--espaco)*3)] mt-[calc(var(--espaco)*2)] flex items-center gap-2 overflow-x-auto px-[calc(var(--espaco)*5)] py-1 [scrollbar-width:none]"
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
      aria-current={active ? "page" : undefined}
      className={cn(
        "max-w-56 min-h-11 flex-none cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap rounded-pilula border px-4 font-titulo text-[0.68rem] font-normal uppercase tracking-[0.2em]",
        "transition-[background-color,border-color,color,transform] duration-instantaneo ease-mola active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        active
          ? "border-acento bg-acento-superficie text-acento-texto"
          : "border-linha bg-superficie text-ink-3 hover:border-acento-borda hover:text-ink-2",
      )}
    >
      {children}
    </button>
  );
}
