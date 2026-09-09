"use client";

import React from "react";
import { TextField } from "@albora/ui-web";
import { Glyph } from "./glyph";

export type TypeOption = { id: string; nome: string; icone: string; preparo: string; posse: string };

export function TypeStep({
  options,
  selectedId,
  onSelectType,
  title,
  onTitle,
  titlePlaceholder,
  date,
  onDate,
  titleError,
  dateError,
  guests,
  onGuests,
  showDetails,
  onToggleDetails,
}: {
  options: TypeOption[];
  selectedId: string;
  onSelectType: (id: string) => void;
  title: string;
  onTitle: (v: string) => void;
  titlePlaceholder: string;
  date: string;
  onDate: (v: string) => void;
  titleError: boolean;
  dateError: boolean;
  guests: string;
  onGuests: (v: string) => void;
  showDetails: boolean;
  onToggleDetails: () => void;
}) {
  const selected = options.find((o) => o.id === selectedId) ?? options[0];

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="m-0 border-0 p-0">
        <legend className="tipo-label mb-2.5 text-ink-3">Que evento é esse?</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {options.map((opt, i) => {
            const ativo = opt.id === selectedId;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => onSelectType(opt.id)}
                className={`group relative flex aspect-[4/3] flex-col items-start justify-between rounded-token p-3 text-left transition-all duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                  ativo
                    ? "border-2 border-acento bg-superficie-alta"
                    : "border border-linha bg-superficie hover:border-acento-texto"
                }`}
              >
                <span
                  aria-hidden
                  className="tipo-label text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100"
                >
                  {i + 1}
                </span>
                <span className={ativo ? "text-acento-texto" : "text-ink-2"}>
                  <Glyph name={opt.icone} size={26} />
                </span>
                <span className="mt-1 font-titulo text-[0.95rem] capitalize text-ink">
                  {opt.nome}
                </span>
                {ativo && (
                  <span
                    aria-hidden
                    className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-acento text-sobre-acento"
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
        <div className="flex items-start gap-2.5 rounded-token bg-superficie-alta px-3.5 py-3 text-ink-2">
          <span aria-hidden className="mt-0.5 shrink-0 text-acento-texto">
            <Glyph name="wand-2" size={18} />
          </span>
          <p className="tipo-caption m-0">
            Preparamos tudo pra <b className="text-ink">{selected.preparo}</b> — momentos, missões e
            telão. Você muda depois.
          </p>
        </div>
      )}

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
        <p id="titulo-erro" role="alert" className="tipo-caption m-0 -mt-3 text-critico">
          Dê um nome ao evento pra continuar.
        </p>
      )}

      <TextField
        label="Data"
        type="date"
        value={date}
        onChange={(e) => onDate(e.target.value)}
        aria-invalid={dateError ? true : undefined}
        aria-describedby={dateError ? "data-erro" : undefined}
      />
      {dateError && (
        <p id="data-erro" role="alert" className="tipo-caption m-0 -mt-3 text-critico">
          Escolha a data do evento.
        </p>
      )}

      <div className="border-t border-linha pt-1">
        <button
          type="button"
          onClick={onToggleDetails}
          aria-expanded={showDetails}
          className="inline-flex min-h-11 items-center gap-1.5 text-[0.85rem] text-ink-3 transition-colors hover:text-ink"
        >
          {showDetails ? "Menos detalhes" : "Mais detalhes"}
          <span aria-hidden className={showDetails ? "rotate-180 transition-transform" : "transition-transform"}>
            ⌄
          </span>
        </button>
        {showDetails && (
          <div className="mt-2 flex flex-col gap-2">
            <label htmlFor="convidados" className="text-[0.9rem] text-ink">
              Quantos convidados você espera?
            </label>
            <p className="tipo-caption m-0 text-ink-3">
              Usamos só pra medir a participação. Fuso e idioma detectamos sozinhos.
            </p>
            <input
              id="convidados"
              type="number"
              min={1}
              max={999}
              inputMode="numeric"
              placeholder="150"
              value={guests}
              onChange={(e) => onGuests(e.target.value)}
              className="min-h-[46px] w-32 rounded-token border border-linha bg-superficie px-3 py-2 font-titulo text-lg text-ink outline-none transition-[border-color] focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto"
            />
          </div>
        )}
      </div>
    </div>
  );
}
