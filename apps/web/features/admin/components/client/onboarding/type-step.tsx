"use client";

import React from "react";
import { Glyph } from "./glyph";

export type TypeOption = {
  id: string;
  nome: string;
  icone: string;
  foto: string;
  preparo: string;
  posse: string;
};

export function TypeStep({
  options,
  selectedId,
  onSelectType,
  onEditMissions,
  missionsAtivas,
  missionsTotal,
}: {
  options: TypeOption[];
  selectedId: string;
  onSelectType: (id: string) => void;
  onEditMissions: () => void;
  missionsAtivas: number;
  missionsTotal: number;
}) {
  const selected = options.find((o) => o.id === selectedId) ?? options[0];

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="m-0 border-0 p-0">
        <legend className="sr-only">Que evento é esse?</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {options.map((opt) => {
            const ativo = opt.id === selectedId;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => onSelectType(opt.id)}
                className={`relative flex min-h-36 min-w-0 flex-col items-start rounded-superficie border p-4 text-left transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-acento-texto sm:min-h-40 sm:p-6 ${
                  ativo ? "border-acento-texto bg-superficie-alta" : "border-linha bg-superficie hover:border-acento-texto"
                }`}
              >
                <Glyph name={opt.icone} size={28} className="mb-6 text-acento-texto" />
                <span className="mt-auto break-words text-base font-medium capitalize text-ink">
                  {opt.nome}
                </span>
                {ativo && (
                  <span
                    aria-hidden
                    className="absolute right-4 top-4 flex size-5 items-center justify-center rounded-full bg-acento text-sobre-acento"
                  >
                    <Glyph name="check" size={13} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {selected && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1.5 tipo-caption text-ink-2">
            <Glyph name="wand-2" size={14} className="text-acento-texto" />
            <span>Momentos e missões já prontos pra <b className="text-ink">{selected.preparo}</b>.</span>
          </span>
          <button
            type="button"
            onClick={onEditMissions}
            className="inline-flex min-h-12 items-center gap-1 rounded-token px-2 tipo-label text-acento-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Glyph name="target" size={12} /> Ajustar missões · {missionsAtivas}/{missionsTotal}
          </button>
        </div>
      )}
    </div>
  );
}
