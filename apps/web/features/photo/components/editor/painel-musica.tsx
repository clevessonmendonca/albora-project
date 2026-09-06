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
      <p className="tipo-caption m-0 text-ink-3">
        Nenhuma música votada ainda. Peça para alguém sugerir uma na aba de
        música do evento.
      </p>
    );
  }

  return (
    <ul className="m-0 grid max-h-[9.5rem] list-none gap-2 overflow-y-auto p-0">
      {musicas.map((m) => {
        const ativa = musicaId === m.id;
        return (
          <li key={m.id}>
            <button
              type="button"
              className={`tipo-body flex min-h-11 w-full items-center rounded-token border px-3 text-left transition-[border-color,color] duration-instantaneo ease-mola active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-acento-texto focus-visible:outline-offset-2 ${
                ativa
                  ? "border-acento text-ink"
                  : "border-linha text-ink-2 hover:border-acento-borda hover:text-ink"
              }`}
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
