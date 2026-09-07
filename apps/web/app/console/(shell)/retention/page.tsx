import React from "react";
import { redirect } from "next/navigation";
import { listRetentionJobs, type RetentionJobAdminRow } from "@albora/application";
import { DataTable, PageHeader, StatusBadge, type DataTableColumn, type StatusBadgeTone } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

const ROTULO_STATUS: Record<RetentionJobAdminRow["status"], string> = {
  pending: "Pendente",
  running: "Rodando",
  done: "Concluído",
  skipped: "Pulado",
  failed: "Falhou",
};

const TOM_STATUS: Record<RetentionJobAdminRow["status"], StatusBadgeTone> = {
  pending: "neutral",
  running: "neutral",
  done: "positive",
  skipped: "atencao",
  failed: "critico",
};

const ROTULO_ETAPA: Record<RetentionJobAdminRow["kind"], string> = {
  plus_48h: "+48h",
  d330_drive: "D-330 · export Drive",
  d358_warn: "D-358 · aviso",
  d365_delete: "D-365 · exclusão",
};

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

/** Vencimento no passado com status ainda pendente é atraso de uma obrigação legal (export/exclusão), não um detalhe de agenda — por isso o destaque é sempre em `text-critico`, igual a um job falhado. */
function isAtrasado(row: RetentionJobAdminRow): boolean {
  return row.status === "pending" && row.dueAt.getTime() < Date.now();
}

/**
 * Tela só-leitura (§10.3) — fila de `retention_jobs` cross-evento, com
 * falhados em destaque no topo. Reprocessar um job falhado é ação e chega
 * na Onda C, com `executeCommand` e auditoria; nenhum botão aqui de
 * propósito. Zero PII de convidado: evento, etapa, vencimento, status e
 * erro (saneado em `listRetentionJobs`) — nunca nome ou contato.
 */
export default async function RetentionPage() {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { rows } = await listRetentionJobs(
    { pool: getPool(), aggregatorPool: getAggregatorPool() },
    { actor, reason: "abrir /console/retention", limit: 100 },
  );

  const columns: DataTableColumn<RetentionJobAdminRow>[] = [
    {
      key: "eventId",
      header: "Evento",
      render: (r) => (
        <a
          href={`/console/events/${r.eventId}`}
          className="tipo-body text-ink underline decoration-ink-3/40 underline-offset-2"
        >
          {r.eventId}
        </a>
      ),
    },
    { key: "kind", header: "Etapa", render: (r) => ROTULO_ETAPA[r.kind] },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <a href={`/console/events/${r.eventId}`}>
          <StatusBadge tone={TOM_STATUS[r.status]}>{ROTULO_STATUS[r.status]}</StatusBadge>
        </a>
      ),
    },
    {
      key: "dueAt",
      header: "Vencimento",
      render: (r) =>
        isAtrasado(r) ? (
          <span className="text-critico">{formatarData(r.dueAt)} — atrasado</span>
        ) : (
          formatarData(r.dueAt)
        ),
    },
    { key: "attempts", header: "Tentativas", align: "end", render: (r) => String(r.attempts) },
    {
      key: "lastError",
      header: "Erro",
      render: (r) => (r.lastError ? <span className="text-critico">{r.lastError}</span> : "—"),
    },
  ];

  return (
    <>
      <PageHeader
        title="Retenção"
        description="Fila de retention_jobs cross-evento — export no dia 330, exclusão no dia 365. Falhados são trabalho pendente, não informação; reprocessar chega na Onda C."
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        pageSize={Math.max(rows.length, 1)}
        pageSizeOptions={[Math.max(rows.length, 1)]}
        itemLabel="jobs"
        emptyMessage="Nenhum job pendente. A fila de retenção aparece aqui quando o primeiro evento termina."
      />
    </>
  );
}
