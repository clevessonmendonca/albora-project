"use client";

import type { EventAdminRow, EventAdminStatus } from "@albora/application";
import {
  DataTable,
  FilterBar,
  StatusBadge,
  type DataTableActiveFilter,
  type DataTableColumn,
  type StatusBadgeTone,
} from "@albora/ui-web";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

export const ROTULO_STATUS_EVENTO: Record<EventAdminStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  ended: "Encerrado",
};

export const TOM_STATUS_EVENTO: Record<EventAdminStatus, StatusBadgeTone> = {
  draft: "neutral",
  active: "positive",
  ended: "neutral",
};

function formatarData(data: Date): string {
  return new Date(data).toLocaleDateString("pt-BR");
}

/** `null` é "não dá pra saber" (sem `expected_guests`); nunca vira "0%", que diria "ninguém participou". */
function formatarH1(h1: number | null): string {
  return h1 === null ? "—" : `${Math.round(h1 * 100)}%`;
}

function selectClassName(): string {
  return (
    "tipo-caption min-h-11 rounded-token border border-linha bg-superficie px-2 text-ink outline-none " +
    "focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto"
  );
}

type ChaveFiltro = "status";

/**
 * Wrapper cliente: busca e status viram querystring (navegação, refetch no
 * servidor) — `DataTable` só exibe a página que já chegou filtrada e
 * paginada por cursor, mesma disciplina de `AccountsTable` (nota de
 * reconhecimento 8/9): nenhum filtro roda em memória sobre a página de 20.
 *
 * H1 é a razão desta tela existir — é a única coluna cuja ordenação importa
 * de verdade pra decidir quais festas funcionaram, por isso `sortable`.
 */
export function EventsTable({ rows, nextCursor }: { rows: EventAdminRow[]; nextCursor: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navegar = (proximos: URLSearchParams) => {
    proximos.delete("cursor"); // qualquer novo filtro ou busca reinicia a paginação
    const query = proximos.toString();
    router.push(query ? `/console/events?${query}` : "/console/events");
  };

  const definirFiltro = (chave: ChaveFiltro, valor: string) => {
    const proximos = new URLSearchParams(searchParams);
    if (valor) proximos.set(chave, valor);
    else proximos.delete(chave);
    navegar(proximos);
  };

  const aplicarBusca = (valor: string) => {
    const proximos = new URLSearchParams(searchParams);
    if (valor) proximos.set("search", valor);
    else proximos.delete("search");
    navegar(proximos);
  };

  const buscaAtual = searchParams.get("search") ?? "";
  const statusAtual = searchParams.get("status") ?? "";

  const activeFilters: DataTableActiveFilter[] = [
    statusAtual
      ? { key: "status", label: `Status: ${ROTULO_STATUS_EVENTO[statusAtual as EventAdminStatus] ?? statusAtual}` }
      : null,
  ].filter((f): f is DataTableActiveFilter => f !== null);

  const removerFiltro = (chave: string) => definirFiltro(chave as ChaveFiltro, "");

  const columns: DataTableColumn<EventAdminRow>[] = [
    {
      key: "title",
      header: "Evento",
      render: (r) => <Link href={`/console/events/${r.id}`}>{r.title ?? r.id}</Link>,
    },
    { key: "host", header: "Anfitrião", render: (r) => r.hostMaskedEmail },
    { key: "vendor", header: "Fornecedor", render: (r) => r.vendorName ?? "—" },
    { key: "startsAt", header: "Data", sortable: true, render: (r) => formatarData(r.startsAt) },
    { key: "expectedGuests", header: "Convidados", align: "end", render: (r) => String(r.expectedGuests) },
    { key: "totalFotos", header: "Fotos", align: "end", render: (r) => String(r.totalFotos) },
    { key: "h1", header: "H1", sortable: true, align: "end", render: (r) => formatarH1(r.h1) },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => <StatusBadge tone={TOM_STATUS_EVENTO[r.status]}>{ROTULO_STATUS_EVENTO[r.status]}</StatusBadge>,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        searchValue={buscaAtual}
        searchPlaceholder="título do evento"
        onSearchChange={aplicarBusca}
        activeFilters={activeFilters}
        onRemoveFilter={removerFiltro}
        filters={
          <label className="flex items-center gap-1.5">
            <span className="sr-only">Status</span>
            <select
              value={statusAtual}
              onChange={(e) => definirFiltro("status", e.target.value)}
              className={selectClassName()}
            >
              <option value="">Todos os status</option>
              {(Object.keys(ROTULO_STATUS_EVENTO) as EventAdminStatus[]).map((valor) => (
                <option key={valor} value={valor}>
                  {ROTULO_STATUS_EVENTO[valor]}
                </option>
              ))}
            </select>
          </label>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        pageSize={Math.max(rows.length, 1)}
        pageSizeOptions={[Math.max(rows.length, 1)]}
        itemLabel="eventos"
        hasActiveFilters={activeFilters.length > 0 || Boolean(buscaAtual)}
        emptyMessage="Nenhum evento ainda. Eles aparecem aqui quando um anfitrião publica o primeiro."
        emptyFilteredMessage="Nenhum evento com este filtro"
      />
      {nextCursor && (
        <a
          href={`/console/events?${(() => {
            const proximos = new URLSearchParams(searchParams);
            proximos.set("cursor", nextCursor);
            return proximos.toString();
          })()}`}
          className="tipo-den-corpo flex min-h-11 items-center self-end px-2 text-acento-texto"
        >
          Próxima página →
        </a>
      )}
    </div>
  );
}
