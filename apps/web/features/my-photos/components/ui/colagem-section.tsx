"use client";

import { PrimaryButton } from "@albora/ui-web";

type ColagemSectionProps = {
  visible: boolean;
  montando: boolean;
  onCriar: () => void;
};

/**
 * Seção de colagem de fotos.
 * CTA para criar colagem com até 4 fotos.
 */
export function ColagemSection({
  visible,
  montando,
  onCriar,
}: ColagemSectionProps) {
  if (!visible) return null;

  return (
    <div className="mt-8 rounded-token border border-linha bg-superficie px-5 py-5">
      <p className="m-0 font-titulo text-d-inline font-light">
        Colagem da noite
      </p>
      <p className="mb-4 mt-2 text-t-body leading-relaxed text-ink-2">
        Até quatro fotos suas, com a moldura desta festa, prontas para postar.
      </p>
      <PrimaryButton disabled={montando} onClick={onCriar}>
        {montando ? "Montando…" : "Criar colagem"}
      </PrimaryButton>
    </div>
  );
}
