"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Dialog } from "./dialog";
import { cn } from "./variants";

export type CommandPaletteResult = { kind: string; id: string; label: string; href: string };

export type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  results: CommandPaletteResult[];
  loading?: boolean;
  onSelect: (result: CommandPaletteResult) => void;
};

const ROTULO_KIND: Record<string, string> = { account: "Conta", event: "Evento", ticket: "Ticket" };
const LISTBOX_ID = "command-palette-listbox";

function optionId(r: CommandPaletteResult): string {
  return `command-palette-option-${r.kind}-${r.id}`;
}

/**
 * Onda D, primitivo de fechamento (spec de design §12). Alcançável por
 * teclado — foco vai pro campo assim que abre; `↓`/`↑` movem o destaque
 * entre resultados; `Enter` escolhe o destacado; `Escape` fecha e devolve o
 * foco pro elemento de origem. Fechamento é explícito aqui (não só o
 * `cancel`/`close` nativo do `<dialog>` via `Dialog`), porque esta paleta
 * desmonta na hora — sem a transição de saída animada — e é a transição
 * quem carrega a devolução de foco nativa nos outros diálogos do console.
 *
 * Anunciado a leitor de tela por dois caminhos complementares (spec §11):
 * `role="listbox"`/`role="option"` descreve a estrutura, e
 * `aria-activedescendant` no campo (que é quem tem o foco de verdade)
 * aponta pro `id` da opção destacada — o padrão ARIA de combobox+listbox,
 * porque mover o foco de DOM pra dentro da lista quebraria digitar. A
 * própria lista é `aria-live="polite"`, então trocar de resultados (ou cair
 * em "nenhum resultado") é anunciado sem precisar de um nó duplicado ecoando
 * o mesmo texto em outro lugar.
 */
export function CommandPalette({
  open,
  onClose,
  query,
  onQueryChange,
  results,
  loading = false,
  onSelect,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const focoAnteriorRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  /**
   * Captura e devolve o foco por conta própria, sem depender só do
   * `showModal()`/`close()` nativo do `<dialog>` — porque esta paleta some do
   * DOM na hora de fechar (early return abaixo), pulando o fechamento
   * animado que é quem carrega a devolução de foco nativa em `Dialog`
   * (`DURACAO_SAIDA_MS`). Guardar o elemento de origem aqui garante que
   * "Esc devolve o foco" vale mesmo sem esperar a transição de saída.
   */
  useEffect(() => {
    if (open) {
      focoAnteriorRef.current = document.activeElement as HTMLElement | null;
      inputRef.current?.focus();
    } else {
      focoAnteriorRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  const mensagemVazia =
    !loading && query.trim().length >= 2 && results.length === 0
      ? `Nenhum resultado para “${query}”.`
      : "";

  function aoTeclarNoCampo(ev: KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "Escape") {
      // Explícito, não só o `cancel`/`close` nativo do `<dialog>` — não dá
      // pra confiar que todo ambiente (inclusive o do teste) dispara o
      // evento nativo pra uma tecla sintética.
      ev.preventDefault();
      onClose();
      return;
    }
    if (results.length === 0) return;
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (ev.key === "Enter") {
      const alvo = results[activeIndex];
      if (alvo) {
        ev.preventDefault();
        onSelect(alvo);
      }
    }
  }

  const opcaoAtiva = results[activeIndex];

  /**
   * Fechado, não monta nada — nunca "invisível mas presente". `<dialog>`
   * fechado já é `display:none` via CSS nativa, mas isso não basta: quem
   * pergunta por rótulo de acessibilidade (`getByLabelText`, e leitor de tela
   * fora do fluxo de renderização) enxerga o nó independente de CSS. Uma
   * paleta fechada que ainda existe no DOM é uma paleta que pode ser
   * "encontrada" por engano — o mesmo espírito de "nunca dado que existe
   * mas não deveria ser alcançável" do restante do console.
   */
  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} aria-label="Busca do console">
      <div className="elev-2 mx-auto mt-24 flex w-full max-w-xl flex-col overflow-hidden rounded-superficie border border-linha bg-superficie">
        <div className="flex items-center gap-2 border-b border-linha px-4 py-3">
          <span aria-hidden className="text-ink-3">
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={aoTeclarNoCampo}
            placeholder="Conta, evento ou id de ticket…"
            aria-label="Buscar conta, evento ou ticket"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={LISTBOX_ID}
            aria-activedescendant={opcaoAtiva ? optionId(opcaoAtiva) : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            className="tipo-den-corpo min-h-11 flex-1 border-none bg-transparent text-ink outline-none placeholder:text-ink-3"
          />
          <kbd className="tipo-den-rotulo text-ink-3">Esc</kbd>
        </div>
        <ul
          id={LISTBOX_ID}
          role="listbox"
          aria-label="Resultados da busca"
          aria-live="polite"
          className="max-h-80 overflow-y-auto py-2"
        >
          {loading && <li className="tipo-den-corpo px-4 py-3 text-ink-3">Buscando…</li>}
          {mensagemVazia && <li className="tipo-den-corpo px-4 py-3 text-ink-3">{mensagemVazia}</li>}
          {!loading &&
            results.map((r, indice) => (
              <li key={`${r.kind}:${r.id}`} id={optionId(r)} role="option" aria-selected={indice === activeIndex}>
                <button
                  type="button"
                  onClick={() => onSelect(r)}
                  onMouseEnter={() => setActiveIndex(indice)}
                  className={cn(
                    "tipo-den-corpo flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left text-ink focus-visible:bg-superficie-alta focus-visible:outline-none",
                    indice === activeIndex ? "bg-superficie-alta" : "hover:bg-superficie-alta",
                  )}
                >
                  <span className="tipo-den-rotulo shrink-0 text-ink-3">{ROTULO_KIND[r.kind] ?? r.kind}</span>
                  <span className="truncate">{r.label}</span>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </Dialog>
  );
}
