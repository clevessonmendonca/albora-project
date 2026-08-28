import React, { type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
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
  children: ReactNode;
};

export function VendorShell({
  vendorName,
  whiteLabelFull,
  brandTokens,
  title,
  subtitle,
  children,
}: VendorShellProps) {
  return (
    <main
      className="min-h-dvh bg-bg p-[clamp(1.5rem,5vw,4rem)] font-[family-name:var(--fonte-corpo)] text-ink"
      style={vendorVars(brandTokens)}
    >
      <header className="mb-10">
        <Link
          href="/admin"
          className="mb-3 block text-[0.75rem] uppercase tracking-rotulo text-ink-3 no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70"
        >
          ← Painel
        </Link>
        <p className="m-0 text-[0.8125rem] uppercase tracking-rotulo text-ink-3">{vendorName}</p>
        <h1 className="m-0 font-titulo text-[1.875rem] font-light tracking-titulo">{title}</h1>
        {subtitle && <p className="mt-2 text-[0.9rem] text-ink-3">{subtitle}</p>}
      </header>
      {children}
      {!whiteLabelFull && (
        <p className="mt-10 text-[0.75rem] text-ink-3">Portal com Albora</p>
      )}
    </main>
  );
}
