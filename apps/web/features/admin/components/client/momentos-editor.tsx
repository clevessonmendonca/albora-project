"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MOMENTOS_MAXIMO,
  MOMENTO_TITULO_MAXIMO,
  momentosIguais,
  novoIdDeMomento,
  validarMomentos,
  type MomentoDoEvento,
} from "@albora/core";
import { Glyph } from "./onboarding/glyph";

const BOTAO =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-token border border-linha bg-superficie text-ink-2 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40";

export function momentosEditorValido(momentos: readonly MomentoDoEvento[]): boolean {
  return validarMomentos(momentos).ok;
}

/** Lista editável do arco do álbum: renomear, adicionar, remover e reordenar por botão ou Alt+setas. Não há posicionamento livre. */
export function MomentosEditor({
  value,
  onChange,
  padrao,
  idBase = "momentos",
}: {
  value: MomentoDoEvento[];
  onChange: (next: MomentoDoEvento[]) => void;
  padrao: MomentoDoEvento[];
  idBase?: string;
}) {
  const [novo, setNovo] = useState("");
  const foco = useRef<string | null>(null);
  const campos = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (foco.current) {
      campos.current.get(foco.current)?.focus();
      foco.current = null;
    }
  });

  const verificacao = validarMomentos(value);
  const erro = verificacao.ok ? null : verificacao.motivo;
  const cheio = value.length >= MOMENTOS_MAXIMO;

  function mover(indice: number, delta: -1 | 1) {
    const alvo = indice + delta;
    if (alvo < 0 || alvo >= value.length) return;
    const prox = [...value];
    const [item] = prox.splice(indice, 1);
    prox.splice(alvo, 0, item!);
    foco.current = item!.id;
    onChange(prox);
  }

  function renomear(id: string, titulo: string) {
    onChange(value.map((m) => (m.id === id ? { ...m, titulo } : m)));
  }

  function remover(id: string) {
    if (value.length <= 1) return;
    onChange(value.filter((m) => m.id !== id));
  }

  function adicionar() {
    const titulo = novo.replace(/\s+/g, " ").trim();
    if (!titulo || cheio) return;
    const id = novoIdDeMomento(value.map((m) => m.id));
    const prox = [...value, { id, titulo }];
    if (!validarMomentos(prox).ok) return;
    onChange(prox);
    setNovo("");
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {value.map((momento, i) => (
          <li key={momento.id} className="flex items-center gap-2">
            <span className="tipo-caption w-5 shrink-0 text-right text-ink-3" aria-hidden="true">
              {i + 1}
            </span>
            <input
              ref={(el) => {
                if (el) campos.current.set(momento.id, el);
                else campos.current.delete(momento.id);
              }}
              id={`${idBase}-${momento.id}`}
              value={momento.titulo}
              maxLength={MOMENTO_TITULO_MAXIMO}
              aria-label={`Nome do momento ${i + 1}`}
              onChange={(e) => renomear(momento.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.altKey && e.key === "ArrowUp") {
                  e.preventDefault();
                  mover(i, -1);
                } else if (e.altKey && e.key === "ArrowDown") {
                  e.preventDefault();
                  mover(i, 1);
                }
              }}
              className="tipo-corpo h-9 min-w-0 flex-1 rounded-token border border-linha bg-superficie px-3 text-ink"
            />
            <button
              type="button"
              className={BOTAO}
              aria-label={`Subir ${momento.titulo || `momento ${i + 1}`}`}
              disabled={i === 0}
              onClick={() => mover(i, -1)}
            >
              <Glyph name="chevron-up" size={16} />
            </button>
            <button
              type="button"
              className={BOTAO}
              aria-label={`Descer ${momento.titulo || `momento ${i + 1}`}`}
              disabled={i === value.length - 1}
              onClick={() => mover(i, 1)}
            >
              <Glyph name="chevron-down" size={16} />
            </button>
            <button
              type="button"
              className={BOTAO}
              aria-label={`Remover ${momento.titulo || `momento ${i + 1}`}`}
              disabled={value.length <= 1}
              onClick={() => remover(momento.id)}
            >
              <Glyph name="x" size={16} />
            </button>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2">
        <input
          value={novo}
          maxLength={MOMENTO_TITULO_MAXIMO}
          disabled={cheio}
          placeholder={cheio ? `Máximo de ${MOMENTOS_MAXIMO} momentos` : "Novo momento"}
          aria-label="Novo momento"
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
          className="tipo-corpo h-9 min-w-0 flex-1 rounded-token border border-linha bg-superficie px-3 text-ink"
        />
        <button
          type="button"
          onClick={adicionar}
          disabled={cheio || novo.trim().length === 0}
          className="tipo-label inline-flex h-9 shrink-0 items-center gap-1 rounded-token border border-linha bg-superficie px-3 text-ink-2 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Glyph name="plus" size={14} /> Adicionar
        </button>
      </div>
      {erro && (
        <p role="alert" className="tipo-caption m-0 text-critico">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <p className="tipo-caption m-0 text-ink-3">
          Organizam o álbum, o livro e o Reviver. A ordem segue a noite, do começo ao fim.
        </p>
        {!momentosIguais(value, padrao) && (
          <button
            type="button"
            onClick={() => onChange(padrao.map((m) => ({ ...m })))}
            className="tipo-label text-acento-texto underline-offset-2 hover:underline"
          >
            Voltar aos momentos do tipo
          </button>
        )}
      </div>
    </div>
  );
}
