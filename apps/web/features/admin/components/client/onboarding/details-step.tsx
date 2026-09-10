"use client";

import React, { useState } from "react";
import { TextField } from "@albora/ui-web";
import { DateTimeField } from "./datetime-field";
import { Glyph } from "./glyph";

const NOME_MAX = 60;

type ViaCep = {
  localidade?: string;
  bairro?: string;
  uf?: string;
  erro?: boolean;
};

/** Passo Detalhes: nome, data e hora (nosso seletor), convidados e local. O local
 *  pode ser preenchido pelo CEP (ViaCEP) — fora do caminho crítico, degrada para
 *  digitação manual se a consulta falhar. */
export function DetailsStep({
  title,
  onTitle,
  titlePlaceholder,
  titleError,
  date,
  onDate,
  dateError,
  guests,
  onGuests,
  local,
  onLocal,
}: {
  title: string;
  onTitle: (v: string) => void;
  titlePlaceholder: string;
  titleError: boolean;
  date: string;
  onDate: (v: string) => void;
  dateError: boolean;
  guests: string;
  onGuests: (v: string) => void;
  local: string;
  onLocal: (v: string) => void;
}) {
  const [cep, setCep] = useState("");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "erro">("idle");

  async function buscarCep(bruto: string) {
    const digs = bruto.replace(/\D/g, "").slice(0, 8);
    setCep(digs.length > 5 ? `${digs.slice(0, 5)}-${digs.slice(5)}` : digs);
    if (digs.length !== 8) {
      setCepStatus("idle");
      return;
    }
    setCepStatus("loading");
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digs}/json/`);
      const data = (await r.json()) as ViaCep;
      if (data.erro) {
        setCepStatus("erro");
        return;
      }
      const partes = [data.bairro, data.localidade].filter(Boolean).join(", ");
      const texto = data.uf ? `${partes} - ${data.uf}` : partes;
      if (texto) onLocal(texto.slice(0, 80));
      setCepStatus("idle");
    } catch {
      setCepStatus("erro");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <TextField
          label="Nome do evento"
          autoFocus
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder={titlePlaceholder}
          maxLength={NOME_MAX}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? "titulo-erro" : undefined}
        />
        {titleError ? (
          <p id="titulo-erro" role="alert" className="tipo-caption m-0 mt-1.5 text-critico">
            Dê um nome ao evento pra continuar.
          </p>
        ) : (
          <p className="tipo-caption m-0 mt-1.5 text-right text-ink-3">
            {title.length}/{NOME_MAX}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <DateTimeField
            label="Data e hora"
            value={date}
            onChange={onDate}
            invalid={dateError}
            describedBy={dateError ? "data-erro" : undefined}
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
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="CEP"
            value={cep}
            onChange={(e) => void buscarCep(e.target.value)}
            aria-label="CEP (preenche o local automaticamente)"
            className="min-h-9 w-28 rounded-token border border-linha bg-superficie px-2.5 text-[0.85rem] text-ink outline-none focus-visible:border-acento-texto"
          />
          <span className="tipo-caption text-ink-3" role="status">
            {cepStatus === "loading"
              ? "buscando…"
              : cepStatus === "erro"
                ? "CEP não encontrado — digite o local"
                : "preenche o local pelo CEP"}
          </span>
        </div>
        {local.trim() && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1 tipo-label text-acento-texto transition-opacity hover:opacity-80"
          >
            <Glyph name="map-pin" size={12} /> Ver no mapa
          </a>
        )}
      </div>
    </div>
  );
}
