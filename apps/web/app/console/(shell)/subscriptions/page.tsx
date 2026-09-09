import React from "react";
import { redirect } from "next/navigation";
import {
  getPlatformRevenue,
  listRefundablePayments,
  listSubscriptions,
  VENDOR_PLAN_PRICE_CENTS,
  type RefundablePaymentRow,
  type VendorSubscriptionAdminRow,
} from "@albora/application";
import { hasCapability } from "@albora/core";
import { DataTable, StatusBadge, type DataTableColumn, type StatusBadgeTone } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";
import { SubscriptionActions } from "@/features/console/components/client/subscription-actions";
import { FaixaDeMetricas, formatarNumero } from "@/features/console/components/server/overview-sections";
import { TituloDaTela } from "@/features/console/components/server/console-primitivos";

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

function formatarReais(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}

/**
 * Mutação de plano, cortesia, cancelamento e reembolso chegam por
 * `executeCommand`, política de limiar e auditoria transacional (ADR
 * 0016) — ver `SubscriptionActions`. A coluna de ações só aparece pra
 * quem tem `subscription.mutate` e/ou `subscription.refund*`; sem
 * nenhuma das duas, a tela continua idêntica à Onda B (só leitura).
 */
export default async function SubscriptionsPage() {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const podeMutar = hasCapability(actor.roles, "subscription.mutate");
  const podeReembolsar =
    hasCapability(actor.roles, "subscription.refund") || hasCapability(actor.roles, "subscription.refund.approve");

  const deps = { pool: getPool(), aggregatorPool: getAggregatorPool() };
  const reason = "abrir /console/subscriptions";

  const [{ rows }, revenue] = await Promise.all([
    listSubscriptions(deps, { actor, reason, limit: 50 }),
    getPlatformRevenue(deps, { actor, reason }),
  ]);

  // Alimenta o seletor de pagamento de `SubscriptionActions` (T6, dívida da
  // Onda D) — só busca quando existe alguém que pode reembolsar; sem isso
  // seria uma leitura cross-evento (`withPlatformAggregation`) por linha
  // que nenhum ator veria de qualquer forma.
  const refundablePaymentsByVendor: Record<string, RefundablePaymentRow[]> = {};
  if (podeReembolsar) {
    await Promise.all(
      rows.map(async (r) => {
        const { rows: pagamentos } = await listRefundablePayments(deps, { actor, reason, vendorId: r.vendorId });
        refundablePaymentsByVendor[r.vendorId] = pagamentos;
      }),
    );
  }

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
    ...(podeMutar || podeReembolsar
      ? [
          {
            key: "acoes",
            header: "Ações",
            render: (r: VendorSubscriptionAdminRow) => (
              <SubscriptionActions
                subscriptionId={r.subscriptionId}
                vendorId={r.vendorId}
                plan={r.plan}
                podeMutar={podeMutar}
                podeReembolsar={podeReembolsar}
                priceTable={VENDOR_PLAN_PRICE_CENTS}
                refundablePayments={refundablePaymentsByVendor[r.vendorId] ?? []}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <TituloDaTela
        titulo="Assinaturas"
        descricao="Assinatura de fornecedor na plataforma. Cortesia e cancelamento mutam pelo Asaas, nunca direto no banco — o webhook confirma o estado."
      />

      <FaixaDeMetricas
        metricas={[
          { rotulo: "MRR", valor: formatarReais(revenue.mrrCents), nota: "assinaturas ativas de fornecedor" },
          { rotulo: "Assinaturas ativas", valor: formatarNumero(revenue.activeSubscriptions) },
          // Contagem, nunca R$ — `vendor_subscriptions` não tem `amount_cents` (lacuna dura).
          { rotulo: "Inadimplência", valor: `${formatarNumero(revenue.overdueCount)} assinatura(s)` },
          // Aproximado — mesmo padrão de apps/web/app/console/(shell)/page.tsx (T3):
          // "≈" no valor, base na nota, nunca um comentário sozinho no código.
          {
            rotulo: "Churn 30d",
            valor: `≈ ${formatarNumero(revenue.churned30d.value)}`,
            nota: revenue.churned30d.approximationBasis,
          },
        ]}
      />

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
