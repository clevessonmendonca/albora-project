"use client";

import Link from "next/link";
import React, { useState } from "react";
import { VENDOR_PLAN_PRICE_CENTS, type VendorPlanTier } from "@albora/core";
import type { PaymentSummary } from "@albora/integrations";
import type { VendorBillingView } from "@/lib/application/use-cases/vendor-billing";
import { useVendorBilling } from "../../hooks/use-vendor-billing";

type Props = Pick<VendorBillingView, "subscription" | "payments" | "providerAvailable" | "paymentsAvailable"> & {
  vendorId: string;
  vendorPlan: VendorPlanTier;
};

const PLAN_LABEL: Record<VendorPlanTier, string> = {
  starter: "Starter",
  studio: "Studio",
  agency: "Agency",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  active: "Em dia",
  overdue: "Pagamento atrasado",
  canceled: "Cancelada",
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  RECEIVED: "Pago",
  OVERDUE: "Atrasado",
  REFUNDED: "Estornado",
};
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const field = "min-h-12 w-full rounded-token border border-linha bg-bg px-4 text-base text-ink outline-none focus:border-acento focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2";
const button = "inline-flex min-h-12 items-center justify-center rounded-pilula border border-linha bg-superficie px-5 text-sm font-semibold text-ink transition-colors hover:border-acento-texto disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2";

function safeInvoiceUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function PaymentRow({ payment }: { payment: PaymentSummary }) {
  const invoiceUrl = safeInvoiceUrl(payment.invoiceUrl);
  const paid = payment.status === "CONFIRMED" || payment.status === "RECEIVED";
  return (
    <li className="grid gap-3 border-b border-linha py-5 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center">
      <time className="text-sm text-ink-3" dateTime={payment.dueDate ?? payment.createdAt}>
        {date.format(new Date(`${payment.dueDate ?? payment.createdAt.slice(0, 10)}T12:00:00`))}
      </time>
      <div>
        <p className="m-0 font-medium text-ink">Mensalidade Albora</p>
        <p className="mb-0 mt-1 text-sm text-ink-3">{STATUS_LABEL[payment.status] ?? payment.status}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <strong className="font-medium tabular-nums text-ink">{money.format(payment.amountCents / 100)}</strong>
        {invoiceUrl && (
          <a className="inline-flex min-h-11 items-center text-sm font-semibold text-acento-texto underline underline-offset-4" href={invoiceUrl} target="_blank" rel="noopener noreferrer">
            {paid ? "Abrir recibo" : "Abrir cobrança"}
          </a>
        )}
      </div>
    </li>
  );
}

export function VendorBillingManager({
  vendorId,
  vendorPlan,
  subscription: initialSubscription,
  payments,
  providerAvailable,
  paymentsAvailable,
}: Props) {
  const billing = useVendorBilling(vendorId, initialSubscription);
  const [plan, setPlan] = useState<VendorPlanTier>(initialSubscription?.pendingPlan ?? initialSubscription?.plan ?? vendorPlan);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const subscription = billing.subscription;

  if (!subscription) {
    return (
      <section className="rounded-superficie bg-superficie-alta p-6 sm:p-8">
        <h2 className="tipo-subtitle m-0">Escolha um plano para começar</h2>
        <p className="tipo-body mb-0 mt-3 max-w-[62ch] text-ink-2">A cobrança mensal aparece aqui depois da confirmação. Você revisa o valor antes de criar a assinatura.</p>
        <Link className="mt-6 inline-flex min-h-12 items-center justify-center rounded-pilula bg-acento px-6 text-sm font-semibold text-sobre-acento no-underline" href={`/admin/vendor/checkout?vendor=${vendorId}&plan=${vendorPlan}`}>Ver planos</Link>
      </section>
    );
  }

  const locked = billing.operation !== null || !providerAvailable || subscription.status !== "active" || subscription.cancelRequestedAt !== null;
  const effectivePlan = subscription.pendingPlan ?? subscription.plan;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.38fr)] lg:items-start">
      <section aria-labelledby="receipts-title" className="min-w-0">
        <h2 id="receipts-title" className="tipo-subtitle m-0">Histórico de cobranças</h2>
        <p className="tipo-caption mb-4 mt-1 text-ink-3">Mensalidades desta assinatura, diretamente do provedor.</p>
        {!paymentsAvailable ? (
          <div className="rounded-superficie bg-superficie-alta p-6" role="status">
            <p className="m-0 font-medium text-ink">O histórico não carregou.</p>
            <p className="mb-0 mt-2 text-sm text-ink-2">Atualize a página em alguns instantes. Isso não altera sua assinatura.</p>
          </div>
        ) : payments.length > 0 ? (
          <ul className="m-0 list-none rounded-superficie border border-linha bg-superficie px-5 py-0 sm:px-6">
            {payments.map((payment) => <PaymentRow key={payment.id} payment={payment} />)}
          </ul>
        ) : (
          <div className="rounded-superficie bg-superficie-alta p-6">
            <p className="m-0 font-medium text-ink">Nenhuma cobrança disponível ainda.</p>
            <p className="mb-0 mt-2 text-sm text-ink-2">Assim que o provedor gerar a primeira mensalidade, ela aparecerá aqui.</p>
          </div>
        )}
      </section>

      <aside className="rounded-superficie bg-ink p-6 text-bg" aria-labelledby="current-plan-title">
        <h2 id="current-plan-title" className="tipo-subtitle m-0 text-bg">Plano {PLAN_LABEL[vendorPlan]}</h2>
        <p className="mb-0 mt-2 text-sm text-bg/75">{subscription.cancelRequestedAt ? "Cancelamento em processamento" : subscription.pendingPlan ? `Mudança para ${PLAN_LABEL[subscription.pendingPlan]} aguardando confirmação` : STATUS_LABEL[subscription.status] ?? subscription.status}</p>
        <p className="mb-0 mt-5 font-titulo text-4xl tabular-nums text-bg">{money.format(VENDOR_PLAN_PRICE_CENTS[effectivePlan] / 100)}<span className="font-corpo text-sm text-bg/70">/mês</span></p>

        <div className="mt-7 border-t border-bg/20 pt-6">
          <label className="grid gap-2 text-sm font-medium text-bg" htmlFor="vendor-billing-plan">Próximo plano</label>
          <select id="vendor-billing-plan" className={field} value={plan} disabled={locked} onChange={(event) => setPlan(event.target.value as VendorPlanTier)}>
            <option value="starter">Starter</option>
            <option value="studio">Studio</option>
            <option value="agency">Agency</option>
          </select>
          <button className={`${button} mt-3 w-full bg-bg`} type="button" disabled={locked || plan === effectivePlan} onClick={() => void billing.changePlan(plan)}>{billing.operation === "plan" ? "Salvando…" : "Confirmar troca"}</button>
          {subscription.status === "overdue" && <p className="mb-0 mt-3 text-sm text-bg/80">Abra a cobrança atrasada no histórico antes de trocar de plano.</p>}
          {!providerAvailable && <p className="mb-0 mt-3 text-sm text-bg/80">Gerenciamento temporariamente indisponível. Seus dados continuam preservados.</p>}
        </div>

        <div aria-live="polite" aria-atomic="true">
          {billing.feedback && <p className="mb-0 mt-4 text-sm text-bg" role={billing.feedback.kind === "error" ? "alert" : "status"}>{billing.feedback.message}</p>}
        </div>

        {!subscription.cancelRequestedAt && subscription.status !== "canceled" && (
          <div className="mt-7 border-t border-bg/20 pt-6">
            {confirmCancel ? (
              <div>
                <p className="m-0 text-sm text-bg">A assinatura para de renovar quando o provedor concluir o cancelamento.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className={`${button} border-bg/30 bg-bg text-critico`} type="button" disabled={billing.operation !== null} onClick={() => void billing.cancel()}>{billing.operation === "cancel" ? "Cancelando…" : "Confirmar cancelamento"}</button>
                  <button className={`${button} border-bg/30 bg-transparent text-bg`} type="button" disabled={billing.operation !== null} onClick={() => setConfirmCancel(false)}>Voltar</button>
                </div>
              </div>
            ) : (
              <button className="min-h-11 text-sm text-bg/80 underline underline-offset-4 hover:text-bg disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={!providerAvailable} onClick={() => setConfirmCancel(true)}>Cancelar assinatura</button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
