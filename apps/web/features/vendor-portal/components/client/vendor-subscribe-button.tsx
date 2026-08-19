"use client";

import React, { useState } from "react";
import type { VendorPlan, VendorRole } from "@albora/db";
import { adminClasses } from "@/features/admin/components/server/admin-shell";
import { VENDOR_PLAN_PRICE_CENTS } from "@/lib/billing";

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
};

/**
 * Gatilho de UI para `POST /api/vendors/{vendorId}/subscription` (V2b) — o
 * gate de papel aqui é conveniência de exibição, não a segurança: a rota
 * revalida `role === "admin"` no servidor de qualquer forma.
 *
 * Não há, no `VendorPortalContext` de hoje, um campo de status de assinatura
 * (`vendor_subscriptions.status`: pending/active/overdue/canceled) — só
 * `vendor.plan`, a coluna de tier de `vendors`. Sem esse dado o botão fica
 * sempre visível para admin, mesmo com uma assinatura `pending` já criada;
 * é lacuna relatada, não suposição sobre o schema.
 */
export function VendorSubscribeButton({ vendorId, role, currentPlan }: Props) {
  const [plan, setPlan] = useState<VendorPlan>(currentPlan);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (role !== "admin") return null;

  const assinar = () => {
    void (async () => {
      setSubmitting(true);
      setError(null);
      try {
        const r = await fetch(`/api/vendors/${vendorId}/subscription`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ plan }),
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
      <p className="m-0 mb-3 text-[0.8125rem] uppercase tracking-rotulo text-ink-3">
        Assinatura
      </p>
      <p className="m-0 mb-4 text-[0.9375rem] leading-relaxed text-ink-2">
        Plano fixo mensal com a plataforma — você cobra o casal por fora, no seu canal.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {PLANOS.map((candidato) => (
          <button
            key={candidato}
            type="button"
            disabled={submitting}
            aria-pressed={plan === candidato}
            onClick={() => setPlan(candidato)}
            className={`cursor-pointer rounded-pilula border px-4 py-2 text-[0.875rem] ${
              plan === candidato
                ? "border-acento bg-acento text-sobre-acento"
                : "border-linha bg-superficie-alta text-ink"
            } ${submitting ? "opacity-60" : ""}`}
          >
            {PLAN_LABEL[candidato]} · {moeda.format(VENDOR_PLAN_PRICE_CENTS[candidato] / 100)}/mês
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={submitting}
        onClick={assinar}
        className={`${adminClasses.primaryButton} ${submitting ? "opacity-60" : ""}`}
      >
        {submitting ? "Assinando…" : "Assinar plano"}
      </button>

      {result && (
        <p className="m-0 mt-4 text-[0.9375rem] text-ink">
          Assinatura {PLAN_LABEL[result.plan]} criada
          {result.stub ? " (ambiente de teste)" : ""}.{" "}
          <a href={result.invoiceUrl} target="_blank" rel="noreferrer" className="text-acento">
            Pagar assinatura
          </a>
        </p>
      )}

      {error && <p className="m-0 mt-4 text-[0.9rem] text-critico">{error}</p>}
    </section>
  );
}
