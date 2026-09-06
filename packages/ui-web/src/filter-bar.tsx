"use client";

import type { ReactNode } from "react";
import { cn } from "./variants";
import type { DataTableActiveFilter } from "./data-table";

/**
 * Busca + filtros + fichas removíveis (spec de design §8.0.2/§12 Onda B).
 * Não filtra sozinho — só emite `onSearchChange`/`onRemoveFilter`; quem
 * chama decide se isso vira uma query nova no servidor (cursor) ou um
 * filtro em memória (nota de reconhecimento 9).
 */
export function FilterBar({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  filters,
  activeFilters,
  onRemoveFilter,
}: {
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  filters?: ReactNode;
  activeFilters?: DataTableActiveFilter[];
  onRemoveFilter?: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[16rem] flex-1">
          <span className="sr-only">{searchPlaceholder}</span>
          <input
            type="search"
            value={searchValue}
            placeholder={searchPlaceholder}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "min-h-11 w-full rounded-token border border-linha bg-superficie px-3.5 text-ink outline-none",
              "placeholder:text-ink-3",
              "focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto",
            )}
          />
        </label>
        {filters}
      </div>
      {activeFilters && activeFilters.length > 0 && (
        <div data-testid="filter-bar-chips" className="flex flex-wrap gap-2">
          {activeFilters.map((filtro) => (
            <span
              key={filtro.key}
              className="tipo-caption inline-flex items-center gap-1.5 rounded-pilula border border-acento bg-acento-superficie px-3 py-1 text-acento-texto"
            >
              {filtro.label}
              <button
                type="button"
                onClick={() => onRemoveFilter?.(filtro.key)}
                aria-label={`Remover filtro ${filtro.label}`}
                className="relative flex size-4 items-center justify-center rounded-full before:absolute before:-inset-3.5 before:content-['']"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
