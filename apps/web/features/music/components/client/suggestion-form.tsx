"use client";

import { TETO_DE_SUGESTOES_POR_SESSAO } from "@albora/core";
import { ErrorMessage, MusicNoteIcon, PrimaryButton, TextField } from "@albora/ui-web";
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
    <section className="mt-7 grid gap-4 border-t border-linha pt-6">
      <div className="grid gap-1.5">
        <h2 className="m-0 tipo-subtitle tipo-balance">Pedidos musicais</h2>
        {open ? (
          <p className="m-0 tipo-body text-ink-2">
            Cole o link da música que você gostaria de ouvir. Você pode sugerir até{" "}
            {TETO_DE_SUGESTOES_POR_SESSAO} faixas diferentes ou votar nas que já estão na lista.
          </p>
        ) : (
          <p className="m-0 tipo-body text-ink-2">
            Os pedidos musicais ainda não foram liberados. Quando os anfitriões liberarem, você
            poderá sugerir suas músicas favoritas aqui.
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
          <div className="grid gap-1.5">
            <TextField
              label="Link da música"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://open.spotify.com/track/…"
              autoComplete="off"
              inputMode="url"
              enterKeyHint="send"
            />
            <button
              type="button"
              disabled={colando}
              onClick={() => {
                setColando(true);
                void colarDaAreaDeTransferencia();
              }}
              className="min-h-11 cursor-pointer justify-self-end rounded-token border-none bg-transparent px-1 text-[0.75rem] text-acento-texto transition-opacity duration-instantaneo ease-mola hover:opacity-70 disabled:cursor-default disabled:opacity-50"
            >
              {colando ? "Colando…" : "Colar da área de transferência"}
            </button>
          </div>
          <PrimaryButton type="submit" disabled={state.submitting || url.trim() === ""}>
            {state.submitting ? "Enviando…" : "Sugerir música"}
          </PrimaryButton>
        </form>
      )}

      {state.capReached && open && (
        <p className="m-0 tipo-body text-ink-2">
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
      <div className="elev-0 grid justify-items-center gap-2 rounded-token px-4 py-7 text-center">
        <span aria-hidden className="text-ink-3">
          <MusicNoteIcon size={20} />
        </span>
        <p className="m-0 tipo-body text-ink-3">
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
          className="elev-1 flex items-center gap-3 rounded-token px-3.5 py-3"
        >
          <div className="min-w-0 flex-1">
            <a
              href={s.url}
              className="block truncate text-[0.9rem] text-ink no-underline transition-opacity duration-instantaneo ease-mola hover:opacity-75"
            >
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
              className="min-h-11 shrink-0 cursor-pointer rounded-pilula border border-linha bg-transparent px-3 text-[0.75rem] uppercase tracking-rotulo text-acento transition-[border-color,transform] duration-instantaneo ease-mola hover:border-acento-texto active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Também quero
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
