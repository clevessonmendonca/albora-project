import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import { extractSlug } from "@albora/core";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import React, { type CSSProperties } from "react";
import { ScanPage } from "@/features/guest/components/client/scan-page";

export const metadata: Metadata = {
  title: "Entrar na festa",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ codigo?: string }> };

/**
 * `?codigo=` é o link de WhatsApp ("recebi o código, quero entrar") — mesmo
 * comportamento de autoenvio que `/{slug}` já tem, não uma segunda confirmação.
 * Código com formato inválido cai no scanner normal, para a pessoa corrigir.
 */
export default async function GuestScanPage({ searchParams }: Props) {
  const { codigo } = await searchParams;
  const slug = typeof codigo === "string" ? extractSlug(codigo) : null;

  if (slug !== null) {
    redirect(`/e/${encodeURIComponent(slug)}?via=code`);
  }

  const vars = toVariables(resolveTokens({ marca: ALBORA_BRAND })) as CSSProperties;

  return (
    <div style={{ ...vars, minHeight: "100dvh" }}>
      <ScanPage />
    </div>
  );
}
