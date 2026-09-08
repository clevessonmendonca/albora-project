"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DataTable,
  FilterBar,
  StatusBadge,
  type DataTableActiveFilter,
  type DataTableColumn,
  type StatusBadgeTone,
} from "@albora/ui-web";
import type { AccountAdminRow, AccountAdminStatus, AccountAdminType } from "@albora/application";

// Exportados: a tela de detalhe (`accounts/[id]/page.tsx`, T5) reaproveita o
// mesmo rótulo/tom — duas telas mostrando o mesmo status com texto diferente
// seria a mesma inconsistência que o resolvedor único de tokens existe pra evitar.
export const ROTULO_TIPO: Record<AccountAdminType, string> = { host: "Anfitrião", vendor: "Fornecedor" };

export const ROTULO_STATUS: Record<AccountAdminStatus, string> = {
  trial: "Trial",
  active: "Ativa",
  suspended: "Suspensa",
  churned: "Encerrada",
};

export const TOM_STATUS: Record<AccountAdminStatus, StatusBadgeTone> = {
  trial: "neutral",
  active: "positive",
  suspended: "critico",
  churned: "atencao",
};

/** Planos conhecidos das duas origens que alimentam a coluna "Plano" — evento (host) e assinatura de fornecedor — nunca inventados, só o que o CHECK do banco permite (migrations 0018, 0037). */
const OPCOES_PLANO = [
  { value: "free", label: "Free" },
  { value: "celebration", label: "Celebration" },
  { value: "starter", label: "Starter" },
  { value: "studio", label: "Studio" },
  { value: "agency", label: "Agency" },
];

function formatarData(data: Date): string {
  return new Date(data).toLocaleDateString("pt-BR");
}

function selectClassName(): string {
  return (
    "tipo-caption min-h-11 rounded-token border border-linha bg-superficie px-2 text-ink outline-none " +
    "focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto"
  );
}

type ChaveFiltro = "type" | "plan" | "status";

/**
 * Wrapper cliente: tipo/plano/status/busca viram querystring (navegação,
 * refetch no servidor) — `DataTable` só exibe a página que já chegou
 * filtrada e paginada por cursor (nota de reconhecimento 8/9). Nenhum
 * filtro roda em memória: um filtro em memória sobre uma página de 20
 * linhas mentiria sobre o total, que é exatamente o que §8.1.2 proíbe.
 */
export function AccountsTable({ rows, nextCursor }: { rows: AccountAdminRow[]; nextCursor: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busca, setBusca] = useState(searchParams.get("search") ?? "");

  const navegar = (proximos: URLSearchParams) => {
    proximos.delete("cursor"); // qualquer novo filtro ou busca reinicia a paginação
    const query = proximos.toString();
    router.push(query ? `/console/accounts?${query}` : "/console/accounts");
  };

  const definirFiltro = (chave: ChaveFiltro, valor: string) => {
    const proximos = new URLSearchParams(searchParams);
    if (valor) proximos.set(chave, valor);
    else proximos.delete(chave);
    navegar(proximos);
  };

  const aplicarBusca = (valor: string) => {
    setBusca(valor);
    const proximos = new URLSearchParams(searchParams);
    if (valor) proximos.set("search", valor);
    else proximos.delete("search");
    navegar(proximos);
  };

  const tipoAtual = searchParams.get("type") ?? "";
  const planoAtual = searchParams.get("plan") ?? "";
  const statusAtual = searchParams.get("status") ?? "";

  const activeFilters: DataTableActiveFilter[] = [
    tipoAtual ? { key: "type", label: `Tipo: ${ROTULO_TIPO[tipoAtual as AccountAdminType] ?? tipoAtual}` } : null,
    planoAtual ? { key: "plan", label: `Plano: ${planoAtual}` } : null,
    statusAtual
      ? { key: "status", label: `Status: ${ROTULO_STATUS[statusAtual as AccountAdminStatus] ?? statusAtual}` }
      : null,
  ].filter((f): f is DataTableActiveFilter => f !== null);

  const removerFiltro = (chave: string) => definirFiltro(chave as ChaveFiltro, "");

  const columns: DataTableColumn<AccountAdminRow>[] = [
    { key: "email", header: "Conta", sortable: true, render: (r) => r.maskedEmail },
    {
      key: "type",
      header: "Tipo",
      sortable: true,
      render: (r) => <StatusBadge tone={r.type === "vendor" ? "informativo" : "neutral"}>{ROTULO_TIPO[r.type]}</StatusBadge>,
    },
    { key: "plan", header: "Plano", sortable: true, render: (r) => r.plan ?? "—" },
    { key: "eventCount", header: "Eventos", sortable: true, align: "end", render: (r) => String(r.eventCount) },
    { key: "createdAt", header: "Criada", sortable: true, render: (r) => formatarData(r.createdAt) },
    {
      key: "lastAccessAt",
      // "Último login", nunca "último acesso" — accounts não tem last_seen_at;
      // a fonte real (host_sessions.created_at) é o último login, não a
      // última ação (Lacunas, ruling do controlador).
      header: "Último login",
      sortable: true,
      render: (r) => (r.lastAccessAt.value ? `≈ ${formatarData(r.lastAccessAt.value)}` : "—"),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => <StatusBadge tone={TOM_STATUS[r.status]}>{ROTULO_STATUS[r.status]}</StatusBadge>,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        searchValue={busca}
        searchPlaceholder="conta, e-mail"
        onSearchChange={aplicarBusca}
        activeFilters={activeFilters}
        onRemoveFilter={removerFiltro}
        filters={
          <>
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Tipo</span>
              <select
                value={tipoAtual}
                onChange={(e) => definirFiltro("type", e.target.value)}
                className={selectClassName()}
              >
                <option value="">Todos os tipos</option>
                <option value="host">Anfitrião</option>
                <option value="vendor">Fornecedor</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Plano</span>
              <select
                value={planoAtual}
                onChange={(e) => definirFiltro("plan", e.target.value)}
                className={selectClassName()}
              >
                <option value="">Todos os planos</option>
                {OPCOES_PLANO.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Status</span>
              <select
                value={statusAtual}
                onChange={(e) => definirFiltro("status", e.target.value)}
                className={selectClassName()}
              >
                <option value="">Todos os status</option>
                {(Object.keys(ROTULO_STATUS) as AccountAdminStatus[]).map((valor) => (
                  <option key={valor} value={valor}>
                    {ROTULO_STATUS[valor]}
                  </option>
                ))}
              </select>
            </label>
          </>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        pageSize={Math.max(rows.length, 1)}
        pageSizeOptions={[Math.max(rows.length, 1)]}
        itemLabel="contas"
        hasActiveFilters={activeFilters.length > 0 || Boolean(busca)}
        emptyMessage="Nenhuma conta ainda. Elas aparecem aqui quando um anfitrião ou fornecedor se cadastra."
        emptyFilteredMessage="Nenhuma conta com este filtro"
      />
      {rows.length > 0 && (
        <p className="tipo-caption m-0 text-ink-3">
          Último login é aproximado — {rows[0]?.lastAccessAt.approximationBasis}.
        </p>
      )}
      {nextCursor && (
        <a
          href={`/console/accounts?${(() => {
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
