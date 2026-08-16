"use client";

import { TETO_DE_SUGESTOES_POR_SESSAO } from "@albora/core";
import { ErrorMessage, PrimaryButton } from "@albora/ui-web";
import { suggestionLabel } from "@/features/music/lib/suggestion-copy";
import type { MusicState } from "@/features/music/hooks/use-music";
import type { VisibleSuggestion } from "@/features/music/types/visible-suggestion";
import { useState } from "react";

export function SuggestionForm({
  state,
  onSuggest,
}: {
  state: MusicState;
  onSuggest: (url: string) => Promise<boolean>;
}) {
  const [url, setUrl] = useState("");
  const open = state.interaction === "completo";
  const canPaste = open && !state.capReached;

  return (
    <section className="grid gap-4 border-t border-linha pt-6">
      <div className="grid gap-1.5">
        <h2 className="m-0 font-titulo text-lg tracking-titulo">Pedidos da festa</h2>
        {open ? (
          <p className="m-0 text-[0.875rem] leading-relaxed text-ink-2">
            Cole o link da faixa. Até {TETO_DE_SUGESTOES_POR_SESSAO} faixas novas por pessoa —
            votar na que já está na lista não conta.
          </p>
        ) : (
          <p className="m-0 text-[0.875rem] leading-relaxed text-ink-2">
            A interação ainda não abriu. Quando abrir, você sugere uma faixa por aqui.
          </p>
        )}
      </div>

      {canPaste && (
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void onSuggest(url).then((ok) => {
              if (ok) setUrl("");
            });
          }}
        >
          <label className="grid gap-1.5">
            <span className="text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
              Link da faixa
            </span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://open.spotify.com/track/…"
              autoComplete="off"
              inputMode="url"
              enterKeyHint="send"
              className="min-h-11 w-full rounded-token border border-linha bg-superficie px-3.5 text-[0.95rem] text-ink outline-none placeholder:text-ink-3 focus:border-acento"
            />
          </label>
          <PrimaryButton type="submit" disabled={state.submitting || url.trim() === ""}>
            {state.submitting ? "Enviando…" : "Sugerir"}
          </PrimaryButton>
        </form>
      )}

      {state.capReached && open && (
        <p className="m-0 text-[0.875rem] leading-relaxed text-ink-2">
          Você já sugeriu {TETO_DE_SUGESTOES_POR_SESSAO} faixas. Pode votar nas que já estão na
          lista.
        </p>
      )}

      {state.suggestionError && <ErrorMessage>{state.suggestionError}</ErrorMessage>}

      <SuggestionList
        suggestions={state.suggestions}
        canVote={open}
        submitting={state.submitting}
        onVote={onSuggest}
      />
    </section>
  );
}

function SuggestionList({
  suggestions,
  canVote,
  submitting,
  onVote,
}: {
  suggestions: VisibleSuggestion[];
  canVote: boolean;
  submitting: boolean;
  onVote: (url: string) => Promise<boolean>;
}) {
  if (suggestions.length === 0) {
    return (
      <p className="m-0 text-[0.875rem] text-ink-3">
        Ninguém sugeriu ainda. A primeira faixa abre a lista.
      </p>
    );
  }

  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {suggestions.map((s) => (
        <li
          key={`${s.provedor}:${s.tipo}:${s.url}`}
          className="flex items-center gap-3 rounded-token border border-linha bg-superficie px-3.5 py-3"
        >
          <div className="min-w-0 flex-1">
            <a href={s.url} className="block truncate text-[0.9rem] text-ink no-underline">
              {suggestionLabel(s)}
            </a>
            <p className="m-0 text-[0.75rem] text-ink-3">
              {s.votos === 1 ? "1 voto" : `${s.votos} votos`}
            </p>
          </div>
          {canVote && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void onVote(s.url)}
              className="min-h-11 shrink-0 cursor-pointer rounded-pilula border border-linha bg-transparent px-3 text-[0.75rem] uppercase tracking-rotulo text-acento disabled:opacity-50"
            >
              Também quero
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
