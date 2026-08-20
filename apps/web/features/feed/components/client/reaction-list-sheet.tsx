"use client";

import { BottomSheet } from "@albora/ui-web";
import type { ReactionListController } from "@/features/feed/hooks/use-reaction-list";

export function ReactionListSheet({ lista }: { lista: ReactionListController }) {
  return (
    <BottomSheet
      title="Quem curtiu"
      open={lista.aberto}
      onClose={lista.fechar}
      titleId="sheet-reacoes-titulo"
    >
      {lista.carregando && <p className="m-0 text-[0.85rem] text-ink-3">Carregando…</p>}

      {lista.erro && (
        <p className="m-0 text-[0.9rem] text-critico" role="alert">
          {lista.erro}
        </p>
      )}

      {!lista.carregando && !lista.erro && lista.nomes.length === 0 && (
        <p className="m-0 text-[0.9rem] text-ink-2">Ninguém curtiu ainda.</p>
      )}

      <ul className="m-0 grid list-none gap-2 p-0">
        {lista.nomes.map((nome, i) => (
          <li key={`${nome}-${i}`} className="font-titulo text-[0.9375rem] tracking-titulo text-ink">
            {nome}
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
