"use client";

import { Card, PrimaryButton } from "@albora/ui-web";

type RecapSectionProps = {
  disponivel: boolean;
  quantidade: number;
  montando: boolean;
  onAbrir: () => void;
};

/**
 * Seção de recap da festa.
 * CTA de destaque para ver o recap personalizado com moldura.
 */
export function RecapSection({
  disponivel,
  quantidade,
  montando,
  onAbrir,
}: RecapSectionProps) {
  if (!disponivel) return null;

  return (
    <Card elevation={2} className="mt-8 grid gap-1">
      <p className="m-0 tipo-subtitle">Recap da festa</p>
      <p className="mb-3 tipo-body text-ink-2">
        Suas {quantidade} melhores fotos, com a moldura desta festa, prontas
        para o story.
      </p>
      <PrimaryButton disabled={montando} onClick={onAbrir}>
        {montando ? "Montando…" : "Ver meu recap"}
      </PrimaryButton>
    </Card>
  );
}
