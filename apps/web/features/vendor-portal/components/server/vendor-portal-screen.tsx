import React from "react";
import type { VendorPortalContext } from "../../data/load-vendor-portal";
import { VendorBrandTokensEditor } from "../client/vendor-brand-tokens-editor";
import { VendorSubscribeButton } from "../client/vendor-subscribe-button";
import { VendorEventsList } from "./vendor-events-list";
import { VendorShell } from "./vendor-shell";
import { VendorSummaryCard } from "./vendor-summary-card";
import Link from "next/link";
import type { VendorPlan } from "@albora/db";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  staff: "Equipe",
};

export function VendorPortalScreen({
  vendor,
  role,
  eventos,
  resumo,
  subscriptionStatus,
  requestedPlan,
}: VendorPortalContext & { requestedPlan?: VendorPlan }) {
  const settingsHref = role === "admin" ? `/admin/vendor/${vendor.id}/settings` : undefined;
  return (
    <VendorShell
      vendorName={vendor.name}
      whiteLabelFull={vendor.plan === "agency"}
      brandTokens={vendor.brandTokens}
      title={eventos.length === 0 ? "Crie a primeira experiência da sua marca." : "O que merece sua atenção hoje?"}
      subtitle={`${ROLE_LABEL[role] ?? role} · plano ${vendor.plan}`}
      vendorSlug={vendor.slug}
      {...(settingsHref ? { settingsHref } : {})}
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href={`/admin/new?vendor=${vendor.id}&vendorSlug=${encodeURIComponent(vendor.slug)}`} className="inline-flex min-h-11 items-center justify-center rounded-pilula bg-acento px-5 text-sm font-semibold text-sobre-acento no-underline hover:opacity-90">+ Criar evento</Link>
          {settingsHref && <Link href={settingsHref} className="inline-flex min-h-11 items-center justify-center rounded-pilula border border-linha px-5 text-sm font-medium text-ink no-underline hover:border-acento-texto">Editar identidade</Link>}
          <Link href="/admin/vendor/insights" className="inline-flex min-h-11 items-center justify-center rounded-pilula border border-linha px-5 text-sm font-medium text-ink no-underline hover:border-acento-texto">Ver insights</Link>
        </div>

        <VendorSummaryCard vendorName={vendor.name} resumo={resumo} />

        <section id="eventos" aria-labelledby="eventos-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><h2 id="eventos-title" className="tipo-subtitle m-0">Seus eventos</h2><p className="tipo-caption mb-0 mt-1 text-ink-3">A carteira vinculada à sua operação.</p></div>
          </div>
          <VendorEventsList eventos={eventos} />
        </section>

        <section id="assinatura">
          <VendorSubscribeButton
            vendorId={vendor.id}
            role={role}
            currentPlan={vendor.plan}
            subscriptionStatus={subscriptionStatus}
            {...(requestedPlan ? { requestedPlan } : {})}
          />
        </section>

        {role === "admin" && <details className="rounded-superficie border border-linha bg-superficie p-5"><summary className="cursor-pointer font-medium text-ink">Ajustes rápidos da marca</summary><div className="mt-6"><VendorBrandTokensEditor vendorId={vendor.id} initialBrandTokens={vendor.brandTokens} /></div></details>}
      </div>
    </VendorShell>
  );
}
