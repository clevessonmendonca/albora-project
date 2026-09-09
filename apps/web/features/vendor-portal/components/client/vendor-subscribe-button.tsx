"use client";

import React, { useState } from "react";
import type { VendorPlan, VendorRole, VendorSubscriptionStatus } from "@albora/db";
import { adminClasses } from "@/features/admin/components/server/admin-shell";
import { VENDOR_PLAN_PRICE_CENTS } from "@albora/integrations";

const PLAN_LABEL: Record<VendorPlan, string> = {
  starter: "Starter",
  studio: "Studio",
  agency: "Agency",
};

const PLANOS: readonly VendorPlan[] = ["starter", "studio", "agency"];

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type SubscriptionResult = {
  invoiceUrl: string;
  plan: VendorPlan;
  amountCents: number;
  stub: boolean;
};

type Props = {
  vendorId: string;
  role: VendorRole;
  currentPlan: VendorPlan;
  subscriptionStatus: VendorSubscriptionStatus | null;
  requestedPlan?: VendorPlan;
};

const SUBSCRIPTION_STATUS_LABEL: Record<"active" | "pending", string> = {
  active: "Assinatura ativa",
  pending: "Aguardando confirmação",
};

/** Gate de papel é UI — a rota revalida `role === "admin"` no servidor (V2b). Mostra estado `active`/`pending` em vez do formulário para evitar dupla cobrança. */
export function VendorSubscribeButton({ vendorId, role, currentPlan, subscriptionStatus, requestedPlan }: Props) {
  const [plan, setPlan] = useState<VendorPlan>(requestedPlan ?? currentPlan);
  const [billingType, setBillingType] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (role !== "admin") return null;

  if (subscriptionStatus === "active" || subscriptionStatus === "pending") {
    return (
      <section className="rounded-superficie border border-linha bg-superficie p-6">
        <p className="m-0 mb-3 text-[0.8125rem] uppercase tracking-rotulo text-ink-3">
          Assinatura
        </p>
        <p className="m-0 text-[0.9375rem] text-ink">
          {SUBSCRIPTION_STATUS_LABEL[subscriptionStatus]}
        </p>
      </section>
    );
  }

  const assinar = () => {
    void (async () => {
      setSubmitting(true);
      setError(null);
      try {
        const r = await fetch(`/api/vendors/${vendorId}/subscription`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ plan, billingType }),
        });
        const body = (await r.json()) as
          | { invoiceUrl: string; plan: VendorPlan; amountCents: number; stub: boolean }
          | { code: string; message: string };
        if (!r.ok) {
          setError("message" in body ? body.message : "Não deu para assinar agora.");
          return;
        }
        if (!("invoiceUrl" in body)) {
          setError("Não deu para assinar agora.");
          return;
        }
        setResult(body);
      } catch {
        setError("Não deu para assinar agora. Tente de novo.");
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <section className="rounded-superficie border border-linha bg-superficie p-6">
      <h2 className="tipo-subtitle m-0">Plano e cobrança</h2>
      <p className="tipo-caption mb-0 mt-2 text-ink-2">Escolha a capacidade da operação. A cobrança é mensal e o plano só é ativado depois da confirmação do provedor.</p>

      <div className="mt-6 grid gap-2 sm:grid-cols-3" role="group" aria-label="Escolha do plano">
        {PLANOS.map((candidato) => (
          <button
            key={candidato}
            type="button"
            disabled={submitting}
            aria-pressed={plan === candidato}
            onClick={() => setPlan(candidato)}
            className={`min-h-11 cursor-pointer rounded-token border px-4 py-3 text-[0.875rem] transition-[border-color,opacity] duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
              plan === candidato
                ? "border-acento bg-acento text-sobre-acento hover:opacity-90"
                : "border-linha bg-superficie-alta text-ink hover:border-acento-texto"
            } ${submitting ? "opacity-60" : ""}`}
          >
            {PLAN_LABEL[candidato]} · {moeda.format(VENDOR_PLAN_PRICE_CENTS[candidato] / 100)}/mês
          </button>
        ))}
      </div>

      <fieldset className="mt-6 border-0 p-0">
        <legend className="tipo-caption mb-3 text-ink-2">Forma de pagamento</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {([['PIX', 'PIX'], ['CREDIT_CARD', 'Cartão']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={submitting}
              aria-pressed={billingType === value}
              onClick={() => setBillingType(value)}
              className={`min-h-11 rounded-token border px-4 py-3 text-left text-sm ${billingType === value ? "border-acento bg-acento-superficie text-ink" : "border-linha bg-superficie text-ink-2"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="my-6 flex items-end justify-between gap-4 border-y border-linha py-5">
        <div><p className="m-0 font-medium text-ink">{PLAN_LABEL[plan]}</p><p className="tipo-caption mb-0 mt-1 text-ink-3">Renovação mensal</p></div>
        <p className="m-0 font-titulo text-2xl tabular-nums text-ink">{moeda.format(VENDOR_PLAN_PRICE_CENTS[plan] / 100)}<span className="font-corpo text-xs text-ink-3">/mês</span></p>
      </div>

      <button
        type="button"
        disabled={submitting}
        onClick={assinar}
        className={`${adminClasses.primaryButton} ${submitting ? "opacity-60" : ""}`}
      >
        {submitting ? "Preparando pagamento…" : "Continuar para pagamento"}
      </button>

      {result && (
        <p className="m-0 mt-4 text-[0.9375rem] text-ink">
          Assinatura {PLAN_LABEL[result.plan]} criada
          {result.stub ? " (ambiente de teste)" : ""}.{" "}
          <a href={result.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-acento transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-80">
            Pagar assinatura
          </a>
        </p>
      )}

      {error && <p className="m-0 mt-4 text-[0.9rem] text-critico">{error}</p>}
    </section>
  );
}
