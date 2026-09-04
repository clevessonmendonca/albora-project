"use client";

import { Card, PrimaryButton } from "@albora/ui-web";

type RetrySectionProps = {
  count: number;
  drenando: boolean;
  onRetry: () => void;
};

/**
 * Seção de retry para fotos que falharam.
 * Tom tranquilizador — a foto está segura no aparelho, não perdida — com
 * um jeito claro de tentar de novo, não um aviso de erro.
 */
export function RetrySection({ count, drenando, onRetry }: RetrySectionProps) {
  if (count === 0) return null;

  return (
    <Card elevation={1} className="mt-8 grid gap-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-acento-superficie text-acento-texto"
        >
          <RetryGlyph />
        </span>
        <p className="m-0 tipo-body text-ink-2">
          {count === 1
            ? "Guardamos a foto no celular. Vamos tentar de novo?"
            : `Guardamos ${count} fotos no celular. Vamos tentar de novo?`}
        </p>
      </div>
      <PrimaryButton disabled={drenando} onClick={onRetry}>
        {drenando ? "Enviando…" : "Tentar de novo"}
      </PrimaryButton>
    </Card>
  );
}

function RetryGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
