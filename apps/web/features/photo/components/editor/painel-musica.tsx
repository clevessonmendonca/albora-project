"use client";

import type { FaixaVotada } from "../client/editor-musica";

type PainelMusicaProps = {
  musicas: readonly FaixaVotada[];
  musicaId: string | null;
  onMusica: (id: string | null) => void;
};

/**
 * Painel de seleção de música para stories.
 * Tocar na faixa já escolhida desmarca (toggle).
 */
export function PainelMusica({
  musicas,
  musicaId,
  onMusica,
}: PainelMusicaProps) {
  if (musicas.length === 0) {
    return (
      <p className="m-0 text-[0.82rem] leading-[1.5] text-ink-3">
        Nenhuma música votada ainda. Peça para alguém sugerir uma na aba de
        música do evento.
      </p>
    );
  }

  return (
    <ul className="ed-musica-lista m-0 grid list-none gap-2 overflow-y-auto p-0">
      {musicas.map((m) => {
        const ativa = musicaId === m.id;
        return (
          <li key={m.id}>
            <button
              type="button"
              className={`ed-musica-item ${ativa ? "ativo" : ""}`}
              aria-pressed={ativa}
              onClick={() => onMusica(ativa ? null : m.id)}
            >
              {m.rotulo}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
