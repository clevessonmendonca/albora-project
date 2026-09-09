"use client";

import Link from "next/link";
import React from "react";
import type { VendorPlan, VendorRole, VendorSubscriptionStatus } from "@albora/db";

const PLAN_LABEL: Record<VendorPlan, string> = {
  starter: "Starter",
  studio: "Studio",
  agency: "Agency",
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

/** O papel é revalidado na página de checkout e novamente na API de assinatura. */
export function VendorSubscribeButton({
  vendorId,
  role,
  currentPlan,
  subscriptionStatus,
  requestedPlan,
}: Props) {
  if (role !== "admin") return null;

  if (subscriptionStatus === "active" || subscriptionStatus === "pending") {
    return (
      <section className="rounded-superficie border border-linha bg-superficie p-6">
        <p className="m-0 text-[0.8125rem] uppercase tracking-rotulo text-ink-3">
          Plano e cobrança
        </p>
        <p className="m-0 mt-3 text-[0.9375rem] text-ink">
          {SUBSCRIPTION_STATUS_LABEL[subscriptionStatus]}
        </p>
        <p className="tipo-caption mb-0 mt-1 text-ink-3">
          Plano {PLAN_LABEL[currentPlan]}. A confirmação do provedor é a fonte de verdade.
        </p>
      </section>
    );
  }

  const plan = requestedPlan ?? currentPlan;
  const checkoutHref = `/admin/vendor/checkout?vendor=${encodeURIComponent(vendorId)}&plan=${plan}`;

  return (
    <section className="flex flex-col gap-5 rounded-superficie border border-linha bg-superficie p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="tipo-subtitle m-0">
          {subscriptionStatus === "overdue" ? "Regularize sua assinatura" : "Escolha a escala da sua operação"}
        </h2>
        <p className="tipo-caption mb-0 mt-2 max-w-[58ch] text-ink-2">
          Revise plano, forma de pagamento e valor antes de criar a cobrança.
        </p>
      </div>
      <Link
        href={checkoutHref}
        className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-pilula bg-acento px-6 text-sm font-semibold text-sobre-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90"
      >
        {subscriptionStatus === "overdue" ? "Regularizar" : "Ver planos"}
      </Link>
    </section>
  );
}
