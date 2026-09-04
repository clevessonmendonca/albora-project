"use client";

import { Card, PrimaryButton } from "@albora/ui-web";

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
    <Card elevation={1} className="mt-8 grid gap-1">
      <p className="m-0 tipo-subtitle">Colagem da noite</p>
      <p className="mb-3 tipo-body text-ink-2">
        Até quatro fotos suas, com a moldura desta festa, prontas para postar.
      </p>
      <PrimaryButton disabled={montando} onClick={onCriar}>
        {montando ? "Montando…" : "Criar colagem"}
      </PrimaryButton>
    </Card>
  );
}
