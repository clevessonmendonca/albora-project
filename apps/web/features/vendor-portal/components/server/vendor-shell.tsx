import React, { type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ALBORA_BRAND, resolveTokens, toVariables, type TokenLayer } from "@albora/tokens";

/** `brandTokens` chega como `Record<string, unknown>` (formato bruto de `events.identity_tokens`) — o cast para `TokenLayer` é decisão de app, nunca de `@albora/db`. */
export function vendorVars(brandTokens: Record<string, unknown>): CSSProperties {
  return toVariables(
    resolveTokens({
      marca: ALBORA_BRAND,
      vendor: brandTokens as TokenLayer,
      pack: { background: "light" },
    }),
  ) as CSSProperties;
}

type VendorShellProps = {
  vendorName: string;
  /** `true` só no tier `agency` — zera o selo "com Albora" (spec §3). */
  whiteLabelFull: boolean;
  brandTokens: Record<string, unknown>;
  title: string;
  subtitle?: string;
  vendorSlug: string;
  settingsHref?: string;
  teamHref?: string;
  billingHref?: string;
  children: ReactNode;
};

export function VendorShell({
  vendorName,
  whiteLabelFull,
  brandTokens,
  title,
  subtitle,
  vendorSlug,
  settingsHref,
  teamHref,
  billingHref,
  children,
}: VendorShellProps) {
  return (
    <main
      className="min-h-dvh bg-bg font-[family-name:var(--fonte-corpo)] text-ink"
      style={vendorVars(brandTokens)}
    >
      <header className="border-b border-linha bg-superficie">
        <div className="mx-auto flex min-h-16 w-full max-w-[80rem] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {!whiteLabelFull && <Image src="/logo-animado-estrela.svg" alt="" width={28} height={28} />}
            <div className="min-w-0">
              <p className="m-0 truncate font-titulo text-lg text-ink">{vendorName}</p>
              {!whiteLabelFull && <p className="m-0 text-xs text-ink-3">com Albora</p>}
            </div>
          </div>
          <Link href="/admin" className="inline-flex min-h-11 items-center rounded-pilula border border-linha px-4 text-sm text-ink no-underline hover:border-acento-texto">
            Minha conta
          </Link>
        </div>
        <nav aria-label="Portal do fornecedor" className="mx-auto flex w-full max-w-[80rem] gap-1 overflow-x-auto px-5 sm:px-8">
          <a href="#visao-geral" className="inline-flex min-h-11 shrink-0 items-center border-b-2 border-acento px-3 text-sm font-medium text-ink no-underline">Hoje</a>
          <a href="#eventos" className="inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-sm text-ink-2 no-underline hover:text-ink">Eventos</a>
          {settingsHref && <Link href={settingsHref} className="inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-sm text-ink-2 no-underline hover:text-ink">Marca</Link>}
          {teamHref && <Link href={teamHref} className="inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-sm text-ink-2 no-underline hover:text-ink">Equipe</Link>}
          {billingHref ? <Link href={billingHref} className="inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-sm text-ink-2 no-underline hover:text-ink">Plano e cobrança</Link> : <a href="#assinatura" className="inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-sm text-ink-2 no-underline hover:text-ink">Plano e cobrança</a>}
        </nav>
      </header>
      <div className="mx-auto w-full max-w-[80rem] px-5 py-8 sm:px-8 lg:py-12">
        <div className="mb-8 max-w-[50rem]" id="visao-geral">
          <p className="m-0 text-sm text-acento-texto">{vendorSlug}</p>
          <h1 className="tipo-title m-0 mt-2">{title}</h1>
          {subtitle && <p className="tipo-body mb-0 mt-3 text-ink-2">{subtitle}</p>}
        </div>
        {children}
        {!whiteLabelFull && <p className="mb-0 mt-12 text-xs text-ink-3">Portal com Albora</p>}
      </div>
    </main>
  );
}
