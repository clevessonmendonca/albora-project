"use client";

import { PrimaryButton } from "@albora/ui-web";

type RecapSectionProps = {
  disponivel: boolean;
  quantidade: number;
  montando: boolean;
  onAbrir: () => void;
};

/**
 * Seção de recap da festa.
 * CTA para ver recap personalizado com moldura.
 */
export function RecapSection({
  disponivel,
  quantidade,
  montando,
  onAbrir,
}: RecapSectionProps) {
  if (!disponivel) return null;

  return (
    <div className="mt-8 rounded-token border border-linha bg-superficie px-5 py-5">
      <p className="m-0 font-titulo text-d-inline font-light">
        Recap da festa
      </p>
      <p className="mb-4 mt-2 text-t-body leading-relaxed text-ink-2">
        Suas {quantidade} melhores fotos, com a moldura desta festa, prontas
        para o story.
      </p>
      <PrimaryButton disabled={montando} onClick={onAbrir}>
        {montando ? "Montando…" : "Ver meu recap"}
      </PrimaryButton>
    </div>
  );
}
