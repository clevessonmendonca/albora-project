import type { CSSProperties } from "react";

/**
 * Classes compartilhadas da Home. Moram fora do módulo `"use client"` de
 * propósito: exportação de módulo cliente vira referência de cliente quando um
 * server component importa, e o `className` chegaria como função em vez de
 * string.
 */
export const acaoPrimaria =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-pilula px-6 font-titulo text-[1rem] no-underline shadow-suave transition-[transform,opacity] duration-instantaneo ease-mola hover:opacity-90 active:scale-[0.98]";

export const acaoSecundaria =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-pilula border border-linha bg-superficie px-5 font-titulo text-[0.95rem] text-ink no-underline transition-[transform,border-color] duration-instantaneo ease-mola hover:border-acento-texto active:scale-[0.98]";

/** Preenchimento na cor do evento — o acento pertence ao casamento, não ao painel. */
export const estiloAcento: CSSProperties = {
  background: "var(--ev, var(--acento))",
  color: "var(--ev-on, var(--sobre-acento))",
};
