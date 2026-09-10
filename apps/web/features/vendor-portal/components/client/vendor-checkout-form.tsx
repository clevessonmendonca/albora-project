"use client";

import Link from "next/link";
import React, { useState } from "react";
import type { VendorPlan } from "@albora/db";
import { VENDOR_PLAN_PRICE_CENTS } from "@albora/integrations";

const PLANOS: ReadonlyArray<{
  id: VendorPlan;
  name: string;
  summary: string;
  capacity: string;
}> = [
  { id: "starter", name: "Starter", summary: "Para começar a oferecer o Albora.", capacity: "Até 3 eventos ativos" },
  { id: "studio", name: "Studio", summary: "Para uma agenda recorrente de eventos.", capacity: "Eventos ativos sem limite" },
  { id: "agency", name: "Agency", summary: "Para equipes e múltiplas marcas.", capacity: "White-label e permissões avançadas" },
];

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type SubscriptionResult = {
  invoiceUrl: string | null;
  plan: VendorPlan;
  amountCents: number;
  stub: boolean;
};

type Props = {
  vendorId: string;
  vendorName: string;
  initialPlan: VendorPlan;
  returnHref: string;
};

function invoiceUrlSegura(value: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function VendorCheckoutForm({ vendorId, vendorName, initialPlan, returnHref }: Props) {
  const [plan, setPlan] = useState<VendorPlan>(initialPlan);
  const [billingType, setBillingType] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = PLANOS.find((candidate) => candidate.id === plan) ?? PLANOS[0]!;
  const formattedPrice = moeda.format(VENDOR_PLAN_PRICE_CENTS[plan] / 100);

  const assinar = async () => {
    if (submitting || result) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/vendors/${vendorId}/subscription`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, billingType }),
      });
      const body = (await response.json()) as
        | SubscriptionResult
        | { code?: string; message?: string };

      if (!response.ok || !("plan" in body)) {
        setError("message" in body && body.message ? body.message : "Não deu para preparar a cobrança. Tente novamente.");
        return;
      }
      setResult(body);
    } catch {
      setError("A conexão caiu antes de preparar a cobrança. Confira sua internet e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const invoiceUrl = result.invoiceUrl;
    const hasInvoice = invoiceUrlSegura(invoiceUrl);
    return (
      <section aria-live="polite" className="rounded-superficie border border-linha bg-superficie p-6 sm:p-8">
        <h2 className="tipo-title m-0">Agora falta a confirmação do pagamento.</h2>
        <p className="tipo-body mb-0 mt-4 max-w-[62ch] text-ink-2">
          A assinatura {selectedPlan.name} foi criada para {vendorName}. O plano será ativado quando o provedor confirmar o pagamento.
          {result.stub ? " Este ambiente está usando uma cobrança de teste." : ""}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          {hasInvoice && (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-pilula bg-acento px-6 text-sm font-semibold text-sobre-acento no-underline hover:opacity-90"
            >
              Abrir pagamento seguro
            </a>
          )}
          <Link href={returnHref} className="inline-flex min-h-12 items-center justify-center rounded-pilula border border-linha px-6 text-sm font-medium text-ink no-underline hover:border-acento-texto">
            Voltar ao portal
          </Link>
        </div>
        {!hasInvoice && (
          <p className="tipo-caption mb-0 mt-5 text-ink-3">
            O provedor não enviou um link de pagamento. Acompanhe a confirmação pelo portal.
          </p>
        )}
      </section>
    );
  }

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-start">
      <section className="min-w-0 rounded-superficie border border-linha bg-superficie p-5 sm:p-7">
        <fieldset className="m-0 border-0 p-0">
          <legend className="tipo-subtitle text-ink">Escolha o plano</legend>
          <div className="mt-5 grid gap-3">
            {PLANOS.map((candidate) => {
              const selected = candidate.id === plan;
              return (
                <label
                  key={candidate.id}
                  className={`grid cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] gap-3 rounded-token border p-4 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${selected ? "border-acento bg-acento-superficie" : "border-linha bg-superficie hover:border-acento-texto"}`}
                >
                  <input
                    type="radio"
                    name="vendor-plan"
                    value={candidate.id}
                    checked={selected}
                    disabled={submitting}
                    onChange={() => setPlan(candidate.id)}
                    className="mt-1 size-4 accent-acento"
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-medium text-ink">
                      <span>{candidate.name}</span>
                      <span className="tabular-nums">{moeda.format(VENDOR_PLAN_PRICE_CENTS[candidate.id] / 100)}/mês</span>
                    </span>
                    <span className="tipo-caption mt-1 block text-ink-2">{candidate.summary}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="m-0 mt-8 border-0 p-0">
          <legend className="tipo-subtitle text-ink">Forma de pagamento</legend>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {([
              ["PIX", "PIX", "Liberação após confirmação"],
              ["CREDIT_CARD", "Cartão", "Pagamento no ambiente seguro"],
            ] as const).map(([value, label, help]) => {
              const selected = billingType === value;
              return (
                <label key={value} className={`flex min-h-20 cursor-pointer gap-3 rounded-token border p-4 ${selected ? "border-acento bg-acento-superficie" : "border-linha bg-superficie hover:border-acento-texto"}`}>
                  <input
                    type="radio"
                    name="billing-type"
                    value={value}
                    checked={selected}
                    disabled={submitting}
                    onChange={() => setBillingType(value)}
                    className="mt-1 size-4 accent-acento"
                  />
                  <span><span className="block font-medium text-ink">{label}</span><span className="tipo-caption mt-1 block text-ink-2">{help}</span></span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>

      <aside className="min-w-0 rounded-superficie bg-ink p-5 text-bg sm:p-7" aria-labelledby="checkout-summary-title">
        <h2 id="checkout-summary-title" className="tipo-subtitle m-0 text-bg">Resumo</h2>
        <dl className="mb-0 mt-6">
          <div className="flex flex-wrap justify-between gap-3 border-b border-bg/20 py-4">
            <dt className="text-sm text-bg/75">Plano</dt><dd className="m-0 text-sm font-medium">{selectedPlan.name}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-3 border-b border-bg/20 py-4">
            <dt className="text-sm text-bg/75">Capacidade</dt><dd className="m-0 max-w-[20ch] text-right text-sm">{selectedPlan.capacity}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-3 border-b border-bg/20 py-4">
            <dt className="text-sm text-bg/75">Recorrência</dt><dd className="m-0 text-sm">Mensal</dd>
          </div>
        </dl>
        <p className="mb-0 mt-7 font-titulo text-4xl font-normal tabular-nums text-bg">
          {formattedPrice}<span className="font-corpo text-sm text-bg/70">/mês</span>
        </p>
        <p className="tipo-caption mb-0 mt-3 text-bg/75">A cobrança só é criada depois que você confirmar abaixo.</p>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void assinar()}
          className="mt-7 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-pilula border-0 bg-bg px-6 text-sm font-semibold text-ink transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? "Preparando cobrança…" : "Confirmar assinatura"}
        </button>
        <p aria-live="assertive" className="mb-0 mt-4 text-sm text-bg">
          {error}
        </p>
      </aside>
    </div>
  );
}
