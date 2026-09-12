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
 * Input + botão remover + instrução de arrasto.
 */
export function TextoTab({ texto, onTexto, onRemoverTexto }: TextoTabProps) {
  return (
    <div className="grid gap-2">
      <input
        className="ed-texto-input"
        type="text"
        inputMode="text"
        placeholder="Escreva alguma coisa…"
        aria-label="Texto sobre a foto"
        maxLength={LIMITE_TEXTO}
        value={texto?.conteudo ?? ""}
        onChange={(e) => onTexto(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <p className="m-0 text-[0.78rem] leading-[1.5] text-ink-3">
          Arraste na foto para posicionar
        </p>
        {texto && (
          <button className="ed-reset" onClick={onRemoverTexto}>
            Remover
          </button>
        )}
      </div>
    </div>
  );
}
