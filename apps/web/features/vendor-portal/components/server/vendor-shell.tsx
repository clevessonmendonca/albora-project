import React, { type CSSProperties, type ReactNode } from "react";
import { ALBORA_BRAND, resolveTokens, toVariables, type TokenLayer } from "@albora/tokens";

/**
 * A camada `vendor` do resolvedor (packages/tokens/src/resolver.ts) — cadeia
 * `marca → vendor → pack → evento`. O portal não tem pack/evento (é a
 * conta do fornecedor, não uma festa específica); `pack: { background }`
 * segue o mesmo atalho que `adminVars` já usa para fixar o chão claro do
 * admin sem herdar o `dark` da marca-piso.
 *
 * `brandTokens` é `Record<string, unknown>` até aqui (mesmo formato bruto de
 * `events.identity_tokens`, packages/db/src/events.ts) — o cast para
 * `TokenLayer` é decisão de app, nunca de `@albora/db`.
 */
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
