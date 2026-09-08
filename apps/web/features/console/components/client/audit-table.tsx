"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, FilterBar, type DataTableActiveFilter, type DataTableColumn } from "@albora/ui-web";
import type { AuditRow, AuditTargetKind } from "@albora/application";

export const ROTULO_ALVO: Record<AuditTargetKind, string> = {
  account: "Conta",
  event: "Evento",
  ticket: "Ticket",
  subscription: "Assinatura",
  staff_user: "Equipe",
  platform: "Plataforma",
  dsar_request: "Pedido LGPD",
  impersonation_request: "Impersonação",
  payment: "Pagamento",
};

const ROTULO_PERIODO: Record<string, string> = {
  "24h": "Últimas 24h",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
};

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const MAX_METADATA_CHARS = 300;

/**
 * `metadata` é JSONB livre — o contrato diz "só id e contador, nunca PII",
 * mas contrato não é constraint de banco (nota do brief da task 9). Mascara
 * padrão de e-mail e trunca antes de qualquer coisa chegar à tela, mesma
 * disciplina de `sanitizarErroDeJob` (packages/db/src/retention-jobs.ts).
 * Não mascara dígito solto: `metadata` costuma carregar contador e id, e um
 * regex de telefone sobre isso apagaria o próprio dado que a tela existe
 * para mostrar.
 */
export function formatarMetadata(metadata: Record<string, unknown> | null | undefined): string {
  const bruto = JSON.stringify(metadata ?? {});
  const semEmail = bruto.replace(EMAIL_RE, "«contato»");
  return semEmail.length > MAX_METADATA_CHARS ? `${semEmail.slice(0, MAX_METADATA_CHARS)}…` : semEmail;
}

function formatarQuando(at: Date): string {
  return new Date(at).toLocaleString("pt-BR");
}

function formatarAtor(row: AuditRow): string {
  if (row.actorLabel) return row.actorLabel;
  if (row.actorKind === "system") return "sistema";
  return row.actorId ?? "—";
}

function formatarAlvo(row: AuditRow): string {
  const rotulo = ROTULO_ALVO[row.targetKind] ?? row.targetKind;
  return row.targetId ? `${rotulo} · ${row.targetId}` : rotulo;
}

/** `ip_hash` já é pseudonimizado por HMAC (mesma disciplina de `formatarIp` em `security/page.tsx`) — exibir o prefixo é correlação, não é "desmascarar". */
function formatarIp(ipHash: string | null): string {
  return ipHash ? `${ipHash.slice(0, 10)}…` : "—";
}

function selectClassName(): string {
  return (
    "tipo-caption min-h-11 rounded-token border border-linha bg-superficie px-2 text-ink outline-none " +
    "focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto"
  );
}

type ChaveFiltro = "target" | "action" | "period";

/**
 * Wrapper cliente: ator (busca), alvo, ação e período viram querystring —
 * mesma disciplina de `AccountsTable`/`EventsTable` (nota de reconhecimento
 * 8/9), nenhum filtro em memória sobre a página que já chegou paginada por
 * cursor.
 *
 * Zero ação de propósito: `audit_log` é append-only por GRANT (UPDATE/
 * DELETE/TRUNCATE revogados do papel da aplicação) — trilha que se edita
 * não é trilha. Nenhum botão de editar, excluir ou "marcar como revisado"
 * chega aqui em nenhuma Onda.
 */
export function AuditTable({ rows, nextCursor }: { rows: AuditRow[]; nextCursor: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navegar = (proximos: URLSearchParams) => {
    proximos.delete("cursor"); // qualquer novo filtro ou busca reinicia a paginação
    const query = proximos.toString();
    router.push(query ? `/console/audit?${query}` : "/console/audit");
  };

  const definirFiltro = (chave: ChaveFiltro, valor: string) => {
    const proximos = new URLSearchParams(searchParams);
    if (valor) proximos.set(chave, valor);
    else proximos.delete(chave);
    navegar(proximos);
  };

  const aplicarBusca = (valor: string) => {
    const proximos = new URLSearchParams(searchParams);
    if (valor) proximos.set("actor", valor);
    else proximos.delete("actor");
    navegar(proximos);
  };

  const atorAtual = searchParams.get("actor") ?? "";
  const alvoAtual = searchParams.get("target") ?? "";
  const acaoAtual = searchParams.get("action") ?? "";
  const periodoAtual = searchParams.get("period") ?? "";

  const activeFilters: DataTableActiveFilter[] = [
    alvoAtual ? { key: "target", label: `Alvo: ${ROTULO_ALVO[alvoAtual as AuditTargetKind] ?? alvoAtual}` } : null,
    acaoAtual ? { key: "action", label: `Ação: ${acaoAtual}` } : null,
    periodoAtual ? { key: "period", label: `Período: ${ROTULO_PERIODO[periodoAtual] ?? periodoAtual}` } : null,
  ].filter((f): f is DataTableActiveFilter => f !== null);

  const removerFiltro = (chave: string) => definirFiltro(chave as ChaveFiltro, "");

  const columns: DataTableColumn<AuditRow>[] = [
    { key: "at", header: "Quando", render: (r) => formatarQuando(r.at) },
    { key: "actor", header: "Ator", render: (r) => formatarAtor(r) },
    {
      key: "action",
      header: "Ação",
      render: (r) => <span className="font-mono tipo-den-dado">{r.action}</span>,
    },
    { key: "target", header: "Alvo", render: (r) => formatarAlvo(r) },
    {
      key: "ip",
      header: "IP",
      render: (r) => <span className="font-mono tipo-den-meta text-ink-3">{formatarIp(r.ipHash)}</span>,
    },
    { key: "reason", header: "Motivo", render: (r) => r.reason },
    {
      key: "metadata",
      header: "Detalhes",
      render: (r) =>
        Object.keys(r.metadata ?? {}).length === 0 ? (
          "—"
        ) : (
          <details>
            <summary className="tipo-den-corpo flex min-h-11 w-fit cursor-pointer items-center text-acento-texto">
              Metadata
            </summary>
            <pre className="tipo-caption mt-1 max-w-xs whitespace-pre-wrap break-words text-ink-3">
              {formatarMetadata(r.metadata)}
            </pre>
          </details>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        searchValue={atorAtual}
        searchPlaceholder="id do ator"
        onSearchChange={aplicarBusca}
        activeFilters={activeFilters}
        onRemoveFilter={removerFiltro}
        filters={
          <>
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Alvo</span>
              <select
                value={alvoAtual}
                onChange={(e) => definirFiltro("target", e.target.value)}
                className={selectClassName()}
              >
                <option value="">Todos os alvos</option>
                {(Object.keys(ROTULO_ALVO) as AuditTargetKind[]).map((valor) => (
                  <option key={valor} value={valor}>
                    {ROTULO_ALVO[valor]}
                  </option>
                ))}
              </select>
            </label>
            <label className="relative flex min-w-[10rem] items-center gap-1.5">
              <span className="sr-only">Ação</span>
              <input
                type="search"
                value={acaoAtual}
                placeholder="ex.: subscription.refund"
                onChange={(e) => definirFiltro("action", e.target.value)}
                className="min-h-11 w-full rounded-token border border-linha bg-superficie px-3.5 text-ink outline-none placeholder:text-ink-3 focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Período</span>
              <select
                value={periodoAtual}
                onChange={(e) => definirFiltro("period", e.target.value)}
                className={selectClassName()}
              >
                <option value="">Todo o período</option>
                <option value="24h">Últimas 24h</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
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
          itemLabel="entradas"
          hasActiveFilters={activeFilters.length > 0 || Boolean(atorAtual)}
          emptyMessage="Nenhuma entrada de auditoria ainda. Elas aparecem aqui quando a equipe age na plataforma."
          emptyFilteredMessage="Nenhuma entrada com este filtro"
        />
      {nextCursor && (
        <a
          href={`/console/audit?${(() => {
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
