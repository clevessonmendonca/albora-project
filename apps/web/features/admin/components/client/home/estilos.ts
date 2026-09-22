import { buttonVariants } from "@albora/ui-web";
import type { CSSProperties } from "react";

/**
 * Presets da Home. Moram fora do módulo `"use client"` de propósito: exportação
 * de módulo cliente vira referência de cliente quando um server component
 * importa, e o `className` chegaria como função em vez de string.
 *
 * O traço vem do Design System — antes eram classes escritas à mão aqui, que é
 * exatamente a divergência que a etapa de adoção do DS veio matar.
 */
export const acaoPrimaria = buttonVariants({ variant: "primary", size: "md" });
export const acaoSecundaria = buttonVariants({ variant: "secondary", size: "md" });

/** Preenchimento na cor do evento — o acento pertence ao evento, não à interface. */
export const estiloAcento: CSSProperties = {
  background: "var(--ev, var(--acento))",
  color: "var(--ev-on, var(--sobre-acento))",
};
