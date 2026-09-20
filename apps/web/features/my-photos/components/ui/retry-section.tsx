"use client";

import { PrimaryButton } from "@albora/ui-web";

type RetrySectionProps = {
  count: number;
  drenando: boolean;
  onRetry: () => void;
};

/**
 * Seção de retry para fotos que falharam.
 * Mostra contador e botão para tentar novamente.
 */
export function RetrySection({ count, drenando, onRetry }: RetrySectionProps) {
  if (count === 0) return null;

  return (
    <div className="mt-8 rounded-token border border-linha bg-superficie px-5 py-4">
      <p className="m-0 mb-3 text-t-body text-ink-2">
        {count === 1
          ? "Guardamos a foto no celular. Vamos tentar de novo?"
          : `Guardamos ${count} fotos no celular. Vamos tentar de novo?`}
      </p>
      <PrimaryButton disabled={drenando} onClick={onRetry}>
        {drenando ? "Enviando…" : "Tentar de novo"}
      </PrimaryButton>
    </div>
  );
}
