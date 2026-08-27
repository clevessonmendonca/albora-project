"use client";

import { TETO_DE_SUGESTOES_POR_SESSAO } from "@albora/core";
import { ErrorMessage, PrimaryButton } from "@albora/ui-web";
import { suggestionLabel } from "@/features/music/lib/suggestion-copy";
import type { MusicState } from "@/features/music/hooks/use-music";
import type { VisibleSuggestion } from "@/features/music/types/visible-suggestion";
import { useState, useCallback } from "react";

export function SuggestionForm({
  state,
  onSuggest,
}: {
  state: MusicState;
  onSuggest: (url: string) => Promise<boolean>;
}) {
  const [url, setUrl] = useState("");
  const [colando, setColando] = useState(false);
  const open = state.interaction === "completo";
  const canPaste = open && !state.capReached;

  const colarDaAreaDeTransferencia = useCallback(async () => {
    try {
      const texto = await navigator.clipboard.readText();
      if (texto.trim()) setUrl(texto.trim());
    } catch {
      // permission denied or clipboard not supported
    } finally {
      setColando(false);
    }
  }, []);

  return (
    <section className="grid gap-4 border-t border-linha pt-6">
      <div className="grid gap-2">
        <h2 className="m-0 font-titulo text-lg tracking-titulo">Pedidos musicais</h2>
        {open ? (
          <p className="m-0 text-[0.875rem] leading-relaxed text-ink-2">
            Cole o link da música que você gostaria de ouvir. Você pode sugerir até{" "}
            {TETO_DE_SUGESTOES_POR_SESSAO} faixas diferentes ou votar nas que já estão na lista.
          </p>
        ) : (
          <p className="m-0 text-[0.875rem] leading-relaxed text-ink-2">
            Os pedidos musicais ainda não foram liberados. Quando os anfitriões liberarem, você
            poderá sugerir suas músicas favoritas aqui.
          </p>
        )}
      </div>

      {canPaste && (
        <form
          className="grid gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            void onSuggest(url).then((ok) => {
              if (ok) setUrl("");
            });
          }}
        >
          <label className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
                Link da música
              </span>
              <button
                type="button"
                disabled={colando}
                onClick={() => {
                  setColando(true);
                  void colarDaAreaDeTransferencia();
                }}
                className="cursor-pointer border-none bg-transparent p-0 text-[0.6875rem] text-acento-texto transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70 disabled:cursor-default disabled:opacity-50"
              >
                {colando ? "Colando…" : "Colar da área de transferência"}
              </button>
            </div>
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
            {state.submitting ? "Enviando…" : "Sugerir música"}
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
      <div className="rounded-token bg-superficie px-4 py-5 text-center">
        <p className="m-0 text-[0.9375rem] leading-relaxed text-ink-3">
          Nenhuma sugestão ainda. Seja o primeiro a sugerir uma música para a festa!
        </p>
      </div>
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
              className="min-h-11 shrink-0 cursor-pointer rounded-pilula border border-linha bg-transparent px-3 text-[0.75rem] uppercase tracking-rotulo text-acento transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto disabled:opacity-50"
            >
              Também quero
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
