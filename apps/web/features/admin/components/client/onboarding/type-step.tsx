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
        <legend className="tipo-label mb-2.5 text-ink-3">Que evento é esse?</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {options.map((opt) => {
            const ativo = opt.id === selectedId;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => onSelectType(opt.id)}
                className={`group relative flex aspect-[4/3] items-end overflow-hidden rounded-token text-left transition-all duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                  ativo ? "ring-2 ring-acento" : "ring-1 ring-linha hover:ring-acento-texto"
                }`}
              >
                <img
                  src={opt.foto}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[var(--curva)] ${
                    ativo ? "scale-105" : "group-hover:scale-105"
                  }`}
                />
                <span aria-hidden className="scrim-foto absolute inset-0" />
                <span
                  aria-hidden
                  className="chip-sobre-foto absolute left-2 top-2 flex size-7 items-center justify-center rounded-full shadow-suave"
                >
                  <Glyph name={opt.icone} size={15} />
                </span>
                <span className="sobre-foto relative z-[1] p-2.5 font-titulo text-[0.95rem] capitalize">
                  {opt.nome}
                </span>
                {ativo && (
                  <span
                    aria-hidden
                    className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-acento text-sobre-acento shadow-suave"
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
            Momentos e missões já prontos pra <b className="text-ink">{selected.preparo}</b>.
          </span>
          <button
            type="button"
            onClick={onEditMissions}
            className="inline-flex items-center gap-1 tipo-label text-acento-texto transition-opacity hover:opacity-80"
          >
            <Glyph name="target" size={12} /> Ajustar missões · {missionsAtivas}/{missionsTotal}
          </button>
        </div>
      )}
    </div>
  );
}
