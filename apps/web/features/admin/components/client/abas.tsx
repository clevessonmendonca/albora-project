"use client";

import type { ReactNode } from "react";

export type Aba<T extends string> = {
  chave: T;
  rotulo: string;
  /** Contador ou medalha à direita do rótulo. */
  adorno?: ReactNode;
};

/**
 * Abas do painel. Vive fora de Fotos e Convidados porque as duas telas usam a
 * mesma faixa — duas cópias divergem no primeiro ajuste de espaçamento.
 */
export function Abas<T extends string>({
  rotulo,
  abas,
  ativa,
  onMudar,
}: {
  rotulo: string;
  abas: Aba<T>[];
  ativa: T;
  onMudar: (chave: T) => void;
}) {
  return (
    <div role="tablist" aria-label={rotulo} className="flex flex-wrap gap-2">
      {abas.map(({ chave, rotulo: texto, adorno }) => {
        const selecionada = ativa === chave;
        return (
          <button
            key={chave}
            type="button"
            role="tab"
            aria-selected={selecionada}
            onClick={() => onMudar(chave)}
            className={`tipo-body inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pilula border px-4 transition-colors duration-instantaneo ${
              selecionada
                ? "border-acento bg-acento text-sobre-acento"
                : "border-linha bg-superficie text-ink-2 hover:text-ink"
            }`}
          >
            {texto}
            {adorno}
          </button>
        );
      })}
    </div>
  );
}
