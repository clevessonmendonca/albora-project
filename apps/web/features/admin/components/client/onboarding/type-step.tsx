"use client";

import React from "react";
import { TextField } from "@albora/ui-web";
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
  title,
  onTitle,
  titlePlaceholder,
  date,
  onDate,
  titleError,
  dateError,
  guests,
  onGuests,
  local,
  onLocal,
}: {
  options: TypeOption[];
  selectedId: string;
  onSelectType: (id: string) => void;
  onEditMissions: () => void;
  missionsAtivas: number;
  missionsTotal: number;
  title: string;
  onTitle: (v: string) => void;
  titlePlaceholder: string;
  date: string;
  onDate: (v: string) => void;
  titleError: boolean;
  dateError: boolean;
  guests: string;
  onGuests: (v: string) => void;
  local: string;
  onLocal: (v: string) => void;
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

      <div className="flex flex-col gap-4 border-t border-linha pt-5">
        <div>
          <TextField
            label="Nome do evento"
            autoFocus
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder={titlePlaceholder}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? "titulo-erro" : undefined}
          />
          {titleError && (
            <p id="titulo-erro" role="alert" className="tipo-caption m-0 mt-1.5 text-critico">
              Dê um nome ao evento pra continuar.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <TextField
              label="Data"
              type="date"
              value={date}
              onChange={(e) => onDate(e.target.value)}
              aria-invalid={dateError ? true : undefined}
              aria-describedby={dateError ? "data-erro" : undefined}
            />
            {dateError && (
              <p id="data-erro" role="alert" className="tipo-caption m-0 mt-1.5 text-critico">
                Escolha a data do evento.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="convidados" className="text-sm font-medium text-ink">
              Convidados esperados
            </label>
            <input
              id="convidados"
              type="number"
              min={1}
              max={999}
              inputMode="numeric"
              placeholder="150"
              value={guests}
              onChange={(e) => onGuests(e.target.value)}
              className="min-h-[48px] w-full rounded-token border border-linha bg-superficie px-3.5 py-2.5 text-ink outline-none transition-[border-color] focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto"
            />
            <p className="tipo-caption m-0 text-ink-3">Só pra medir a participação.</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="local" className="text-sm font-medium text-ink">
            Local <span className="font-normal text-ink-3">· opcional</span>
          </label>
          <input
            id="local"
            type="text"
            maxLength={80}
            placeholder="Espaço, cidade"
            value={local}
            onChange={(e) => onLocal(e.target.value)}
            className="min-h-[48px] w-full rounded-token border border-linha bg-superficie px-3.5 py-2.5 text-ink outline-none transition-[border-color] focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto"
          />
        </div>
      </div>
    </div>
  );
}
