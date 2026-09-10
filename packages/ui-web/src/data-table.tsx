"use client";

import { useState, type ReactNode } from "react";
import { cn } from "./variants";
import { Skeleton } from "./skeleton";
import { Button } from "./button";
import { announce } from "./live-announcer";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "start" | "end";
  width?: string;
};

/** Uma ficha de filtro ativo, mostrada como removível abaixo da barra. */
export type DataTableActiveFilter = {
  key: string;
  label: string;
};

type SortState = { key: string; direction: "ascending" | "descending" } | null;

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;

  /** Vazio de verdade: sem filtro ativo, o dataset em si não tem registro nenhum. */
  emptyMessage?: string;
  /** Vazio por filtro: há filtro ativo e ele zerou o resultado — nunca a mesma mensagem do vazio de verdade. */
  emptyFilteredMessage?: string;
  /** Se omitido, é derivado de `activeFilters`/`searchValue`. */
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;

  pageSize?: number;
  pageSizeOptions?: number[];
  /**
   * Avisa quem chama que o operador trocou o tamanho de página, pra persistir
   * entre sessões (ex.: localStorage). `ui-web` não acessa armazenamento —
   * guard de domínio (ADR 0010): "se não desenha pixel, não mora em ui-*".
   */
  onPageSizeChange?: (value: number) => void;

  /** Rótulo do que está sendo contado ("itens", "tickets", "contas"...). */
  itemLabel?: string;

  searchValue?: string;
  /** Diga o que é buscável ("conta, e-mail, id do evento") — nunca "Buscar…". */
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;

  activeFilters?: DataTableActiveFilter[];
  onRemoveFilter?: (key: string) => void;
  onOpenFilters?: () => void;

  /** Exportar é opt-in; a auditoria da exportação é responsabilidade de quem chama. */
  exportable?: boolean;
  onExport?: () => void;

  /** Suprime a barra de ferramentas inteira — telas embutidas (ex.: trilha de auditoria num painel). */
  hideToolbar?: boolean;
};

const TAMANHOS_PADRAO = [10, 20, 25, 50];

/** Botão de cabeçalho ordenável: alvo de toque expandido via pseudo-elemento, sem inflar a linha de 36px. */
function BotaoOrdenacao({ coluna, onToggle }: { coluna: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "tipo-label relative flex w-full items-center gap-1 bg-transparent text-left text-inherit",
        "before:absolute before:-inset-y-3.5 before:inset-x-0 before:content-['']",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-acento-texto focus-visible:outline-offset-2",
      )}
    >
      {coluna}
    </button>
  );
}

function ChipDeFiltro({ label, onRemove }: { label: string; onRemove?: (() => void) | undefined }) {
  return (
    <span className="tipo-caption inline-flex items-center gap-1.5 rounded-pilula border border-acento bg-acento-superficie px-3 py-1 text-acento-texto">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover filtro ${label}`}
        className="relative flex size-4 items-center justify-center rounded-full before:absolute before:-inset-3 before:content-['']"
      >
        ×
      </button>
    </span>
  );
}

type ToolbarProps = {
  count: number;
  itemLabel: string;
  searchValue?: string | undefined;
  searchPlaceholder?: string | undefined;
  onSearchChange?: ((value: string) => void) | undefined;
  onOpenFilters?: (() => void) | undefined;
  exportable: boolean;
  onExport?: (() => void) | undefined;
  pageSizeOptions: number[];
  pageSize: number;
  onPageSizeChange: (value: number) => void;
};

function DataTableToolbar({
  count,
  itemLabel,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onOpenFilters,
  exportable,
  onExport,
  pageSizeOptions,
  pageSize,
  onPageSizeChange,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-linha px-4 py-3">
      <span className="tipo-den-meta whitespace-nowrap tabular-nums text-ink-3">
        {count} {itemLabel}
      </span>

      {onSearchChange && (
        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">{searchPlaceholder ?? "Buscar"}</span>
          <input
            type="search"
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(
              "tipo-den-corpo min-h-11 w-full rounded-token border border-linha bg-superficie-alta px-3.5 text-ink outline-none",
              "placeholder:text-ink-3",
              "focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto",
            )}
          />
        </label>
      )}

      {onOpenFilters && (
        <Button type="button" variant="secondary" size="sm" onClick={onOpenFilters}>
          Filtros
        </Button>
      )}

      {exportable && (
        <Button type="button" variant="secondary" size="sm" onClick={onExport}>
          Exportar
        </Button>
      )}

      <label className="ml-auto flex items-center gap-1.5 whitespace-nowrap">
        <span className="sr-only">Itens por página</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className={cn(
            "tipo-den-meta min-h-11 rounded-token border border-linha bg-superficie-alta px-2 text-ink outline-none",
            "focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto",
          )}
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function EstadoVazio({
  mensagem,
  filtrado,
  onClearFilters,
}: {
  mensagem: string;
  filtrado: boolean;
  onClearFilters?: (() => void) | undefined;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="tipo-den-corpo m-0 text-ink-3">{mensagem}</p>
      {filtrado && onClearFilters && (
        <Button type="button" variant="tertiary" size="sm" onClick={onClearFilters}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

function PaginacaoControles({
  pagina,
  totalPaginas,
  onAnterior,
  onProxima,
}: {
  pagina: number;
  totalPaginas: number;
  onAnterior: () => void;
  onProxima: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-linha px-4 py-3">
      <Button type="button" variant="secondary" size="sm" disabled={pagina === 0} onClick={onAnterior}>
        Anterior
      </Button>
      <span className="tipo-den-meta tabular-nums text-ink-3">
        Página {pagina + 1} de {totalPaginas}
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pagina >= totalPaginas - 1}
        onClick={onProxima}
      >
        Próxima
      </Button>
    </div>
  );
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = "Nada para mostrar",
  emptyFilteredMessage = "Nenhum resultado com estes filtros",
  hasActiveFilters,
  onClearFilters,
  pageSize = 20,
  pageSizeOptions = TAMANHOS_PADRAO,
  onPageSizeChange,
  itemLabel = "itens",
  searchValue,
  searchPlaceholder,
  onSearchChange,
  activeFilters,
  onRemoveFilter,
  onOpenFilters,
  exportable = false,
  onExport,
  hideToolbar = false,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);
  const [tamanhoPagina, setTamanhoPagina] = useState(pageSize);

  const toggleSort = (coluna: DataTableColumn<T>) => {
    setSort((atual) => {
      const proximo: SortState =
        !atual || atual.key !== coluna.key
          ? { key: coluna.key, direction: "ascending" }
          : atual.direction === "ascending"
            ? { key: coluna.key, direction: "descending" }
            : null;

      announce(
        proximo
          ? `${coluna.header}, ordenado ${proximo.direction === "ascending" ? "crescente" : "decrescente"}`
          : `${coluna.header}, ordenação removida`,
      );
      return proximo;
    });
  };

  const handlePageSizeChange = (valor: number) => {
    setTamanhoPagina(valor);
    setPage(0);
    onPageSizeChange?.(valor);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-label="Carregando">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-11 w-full" />
        ))}
      </div>
    );
  }

  const filtrosAtivos = hasActiveFilters ?? ((activeFilters?.length ?? 0) > 0 || Boolean(searchValue));
  const totalPaginas = Math.max(1, Math.ceil(rows.length / tamanhoPagina));
  const paginaSegura = Math.min(page, totalPaginas - 1);
  const visiveis = rows.slice(paginaSegura * tamanhoPagina, paginaSegura * tamanhoPagina + tamanhoPagina);

  // Moldura do v5 (`.tblwrap`): a tabela é um painel, não uma laje solta no
  // canvas. Sem ela, barra de ferramentas, linhas e paginação flutuam sem
  // nada dizendo que são a mesma coisa.
  return (
    <div className="overflow-hidden rounded-media border border-linha bg-superficie">
      {!hideToolbar && (
        <DataTableToolbar
          count={rows.length}
          itemLabel={itemLabel}
          searchValue={searchValue}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={onSearchChange}
          onOpenFilters={onOpenFilters}
          exportable={exportable}
          onExport={onExport}
          pageSizeOptions={pageSizeOptions}
          pageSize={tamanhoPagina}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {!hideToolbar && activeFilters && activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-linha px-4 py-3">
          {activeFilters.map((filtro) => (
            <ChipDeFiltro
              key={filtro.key}
              label={filtro.label}
              onRemove={onRemoveFilter ? () => onRemoveFilter(filtro.key) : undefined}
            />
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <EstadoVazio
          mensagem={filtrosAtivos ? emptyFilteredMessage : emptyMessage}
          filtrado={filtrosAtivos}
          onClearFilters={onClearFilters}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {columns.map((coluna) => (
                    <th
                      key={coluna.key}
                      scope="col"
                      className={cn(
                        "sticky top-0 z-10 h-10 border-b border-linha bg-superficie px-4 align-middle font-[family-name:var(--fonte-titulo)] text-[0.68rem] font-normal uppercase tracking-[0.14em] text-ink-3",
                        coluna.align === "end" && "text-right",
                      )}
                      style={coluna.width ? { width: coluna.width } : undefined}
                      aria-sort={coluna.sortable ? (sort?.key === coluna.key ? sort.direction : "none") : undefined}
                    >
                      {coluna.sortable ? (
                        <BotaoOrdenacao coluna={coluna.header} onToggle={() => toggleSort(coluna)} />
                      ) : (
                        coluna.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className="border-b border-linha transition-colors duration-[var(--tempo)] ease-[var(--curva)] last:border-b-0 hover:bg-superficie-alta"
                  >
                    {columns.map((coluna) => (
                      <td
                        key={coluna.key}
                        className={cn(
                          "tipo-den-dado h-12 px-4 align-middle text-ink",
                          coluna.align === "end" && "text-right",
                        )}
                      >
                        {coluna.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPaginas > 1 && (
            <PaginacaoControles
              pagina={paginaSegura}
              totalPaginas={totalPaginas}
              onAnterior={() => setPage(paginaSegura - 1)}
              onProxima={() => setPage(paginaSegura + 1)}
            />
          )}
        </>
      )}
    </div>
  );
}
