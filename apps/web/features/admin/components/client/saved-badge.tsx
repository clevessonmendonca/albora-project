import type { ReactNode } from "react";
import { StatusBadge } from "@albora/ui-web";

/**
 * Confirmação de "salvou". Era o mesmo selo copiado em quatro editores (capa,
 * música, recado, identidade) — mesmas classes, mesmo SVG, e todos pintados com
 * o acento da marca, que significa "ação", não "deu certo". Agora sai do DS com
 * o tom `positive`, que tem token próprio.
 */
export function SavedBadge({ children = "Salvo" }: { children?: ReactNode }) {
  return (
    <StatusBadge tone="positive">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path
          d="M2 6l2.5 2.5L10 3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </StatusBadge>
  );
}
