import React from "react";
import { redirect } from "next/navigation";
import {
  getPlatformRevenue,
  listSubscriptions,
  VENDOR_PLAN_PRICE_CENTS,
  type VendorSubscriptionAdminRow,
} from "@albora/application";
import { DataTable, MetricCard, PageHeader, StatusBadge, type DataTableColumn, type StatusBadgeTone } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

const ROTULO_STATUS: Record<VendorSubscriptionAdminRow["status"], string> = {
  pending: "Pendente",
  active: "Ativa",
  overdue: "Em atraso",
  canceled: "Cancelada",
};

const TOM_STATUS: Record<VendorSubscriptionAdminRow["status"], StatusBadgeTone> = {
  pending: "neutral",
  active: "positive",
  overdue: "critico",
  canceled: "atencao",
};

function formatarNumero(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function formatarReais(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}

/**
 * Tela só-leitura (§8.1.5) — mutação de plano, cortesia, cancelamento e
 * reembolso chegam na Onda C, com `executeCommand`, política de limiar e
 * auditoria transacional (ADR 0016). Nenhum botão de ação aqui de propósito.
 */
export default async function SubscriptionsPage() {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const deps = { pool: getPool(), aggregatorPool: getAggregatorPool() };
  const reason = "abrir /console/subscriptions";

  const [{ rows }, revenue] = await Promise.all([
    listSubscriptions(deps, { actor, reason, limit: 50 }),
    getPlatformRevenue(deps, { actor, reason }),
  ]);

  const algumAtraso = rows.some((r) => r.overdueDays !== null);
  const basisAtraso = rows.find((r) => r.overdueDays !== null)?.overdueDays?.approximationBasis;

  const columns: DataTableColumn<VendorSubscriptionAdminRow>[] = [
    { key: "vendorName", header: "Fornecedor", sortable: true, render: (r) => r.vendorName },
    { key: "plan", header: "Plano", sortable: true, render: (r) => r.plan },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => <StatusBadge tone={TOM_STATUS[r.status]}>{ROTULO_STATUS[r.status]}</StatusBadge>,
    },
    {
      // Não existe coluna de vencimento em `vendor_subscriptions` — o Asaas
      // sabe, o banco local não guarda (lacuna, ver subscriptions-admin.ts).
      // Mostra sempre "—", nunca estima nem chama a API pra preencher.
      key: "nextChargeAt",
      header: "Próxima cobrança",
      render: () => "—",
    },
    {
      key: "overdueDays",
      header: "Atraso",
      align: "end",
      // Aproximação por `now() - updated_at` — marcador `≈` obrigatório,
      // sem esperar um limiar de dias (spec §8.1.5: crítico desde o
      // primeiro dia de atraso).
      render: (r) =>
        r.overdueDays === null ? (
          "—"
        ) : (
          <span className="text-critico">≈ {r.overdueDays.value}d</span>
        ),
    },
    {
      key: "valor",
      header: "Valor",
      align: "end",
      render: (r) => formatarReais(VENDOR_PLAN_PRICE_CENTS[r.plan]),
    },
  ];

  return (
    <>
      <PageHeader
        title="Assinaturas"
        description="Assinatura de fornecedor na plataforma — leitura. Trocar plano, cortesia, cancelar e reembolsar chegam na Onda C."
      />

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          rotulo="MRR"
          valor={formatarReais(revenue.mrrCents)}
          valorNumerico={revenue.mrrCents}
          bomQuando="sobe"
          janela="Assinaturas ativas de fornecedor"
        />
        <MetricCard
          rotulo="Assinaturas ativas"
          valor={formatarNumero(revenue.activeSubscriptions)}
          valorNumerico={revenue.activeSubscriptions}
          bomQuando="sobe"
          janela="Agora"
        />
        {/* Contagem, nunca R$ — `vendor_subscriptions` não tem `amount_cents` (lacuna dura). */}
        <MetricCard
          rotulo="Inadimplência"
          valor={`${formatarNumero(revenue.overdueCount)} assinatura(s)`}
          valorNumerico={revenue.overdueCount}
          bomQuando="desce"
          janela="Agora"
        />
        {/* Aproximado — mesmo padrão de apps/web/app/console/(shell)/page.tsx:203-204 (T3): "≈" no valor, base na linha de apoio, nunca um comentário sozinho no código. */}
        <div className="flex flex-col gap-2 rounded-2xl border border-linha bg-superficie p-5">
          <span className="tipo-den-rotulo text-ink-3">Churn 30d</span>
          <span className="tipo-den-metrica text-ink">≈ {formatarNumero(revenue.churned30d.value)}</span>
          <span className="tipo-den-corpo text-ink-3">aproximado: {revenue.churned30d.approximationBasis}</span>
        </div>
      </section>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.vendorId}
        pageSize={Math.max(rows.length, 1)}
        pageSizeOptions={[Math.max(rows.length, 1)]}
        itemLabel="assinaturas"
        emptyMessage="Nenhuma assinatura de fornecedor ainda. Elas aparecem aqui quando um fornecedor assina um plano pago."
      />

      {algumAtraso && basisAtraso ? (
        <p className="tipo-caption m-0 mt-3 text-ink-3">Atraso é aproximado — {basisAtraso}.</p>
      ) : null}
    </>
  );
}
