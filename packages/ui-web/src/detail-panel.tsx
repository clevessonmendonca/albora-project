import type { ReactNode } from "react";

export type DetailPanelSection = {
  key: string;
  label: string;
  content: ReactNode;
  /** Mostrado quando `content` é `null`/`undefined` — nunca "Sem dados". */
  emptyLabel: string;
};

/** Painel lateral de detalhe com título e seções (spec §8.1.3) — cada seção é vazia-ou-conteúdo, nunca ambos. */
export function DetailPanel({ title, sections }: { title: string; sections: DetailPanelSection[] }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-linha bg-superficie p-5">
      <h2 className="tipo-den-titulo m-0">{title}</h2>
      {sections.map((secao) => (
        <div key={secao.key} className="flex flex-col gap-2 border-t border-linha pt-4 first:border-t-0 first:pt-0">
          <span className="tipo-den-rotulo text-ink-3">{secao.label}</span>
          {secao.content ?? <p className="tipo-den-corpo m-0 text-ink-3">{secao.emptyLabel}</p>}
        </div>
      ))}
    </section>
  );
}
