"use client";

import type { TextoComposto } from "@albora/core";
import { LIMITE_TEXTO } from "../client/editor-texto";

type TextoTabProps = {
  texto: TextoComposto | null;
  onTexto: (conteudo: string) => void;
  onRemoverTexto: () => void;
};

/**
 * Aba de texto sobre foto (composer).
 * Input com a tipografia do sistema + instrução de arrasto + remover.
 */
export function TextoTab({ texto, onTexto, onRemoverTexto }: TextoTabProps) {
  return (
    <div className="grid gap-2.5">
      <input
        className="tipo-body min-h-11 border-0 border-b border-linha bg-transparent px-0.5 text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] placeholder:text-ink-3 focus-visible:border-acento focus-visible:outline-none"
        type="text"
        inputMode="text"
        placeholder="Escreva alguma coisa…"
        aria-label="Texto sobre a foto"
        maxLength={LIMITE_TEXTO}
        value={texto?.conteudo ?? ""}
        onChange={(e) => onTexto(e.target.value)}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="tipo-caption m-0 text-ink-3">Arraste na foto para posicionar</p>
        {texto && (
          <button
            type="button"
            className="tipo-label min-h-11 shrink-0 uppercase text-ink-3 transition-[color,transform] duration-instantaneo ease-mola hover:text-ink-2 active:scale-95 motion-reduce:active:scale-100"
            onClick={onRemoverTexto}
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}
