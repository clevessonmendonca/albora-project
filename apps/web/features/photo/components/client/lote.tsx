"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@albora/ui-web";
import { LIMITE_LOTE } from "../../lib/lote";
import type { Place } from "./details";

const MAX_LEGENDA = 280;

const CLASSE_ROTULO =
  "font-titulo text-[0.7rem] font-normal uppercase tracking-[0.28em] text-ink-3";

const CLASSE_MOMENTO =
  "min-h-12 cursor-pointer rounded-pilula border border-linha bg-transparent px-[1.15rem] font-titulo text-[0.9rem] font-normal text-ink-2 transition-[color,border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-acento focus-visible:outline-offset-[5px] motion-reduce:transition-none";

export function rotuloEnviar(n: number): string {
  return n === 1 ? "Enviar 1 foto" : `Enviar ${n} fotos`;
}

/** O momento escolhido vale para o lote inteiro; "Livre" é não marcar nenhum — mesma lista fechada do pack que a tela de detalhes. */
export function Lote({
  arquivos: iniciais,
  excedeu,
  momentos,
  perguntaDoMomento,
  momentoInicial = null,
  enviando = false,
  onEnviar,
  onCancelar,
}: {
  arquivos: File[];
  excedeu: boolean;
  momentos: Place[];
  perguntaDoMomento: string;
  momentoInicial?: string | null;
  enviando?: boolean;
  onEnviar: (arquivos: File[], detalhes: { legenda: string | null; lugar: string | null }) => void;
  onCancelar: () => void;
}) {
  const [arquivos, setArquivos] = useState(iniciais);
  const [momento, setMomento] = useState<string | null>(momentoInicial);
  const [legenda, setLegenda] = useState("");

  const miniaturas = useMemo(
    () =>
      arquivos.map((arquivo) => ({
        arquivo,
        url: arquivo.type.startsWith("video/") ? null : URL.createObjectURL(arquivo),
      })),
    [arquivos],
  );

  useEffect(
    () => () => {
      for (const m of miniaturas) if (m.url) URL.revokeObjectURL(m.url);
    },
    [miniaturas],
  );

  function remover(indice: number) {
    const restantes = arquivos.filter((_, i) => i !== indice);
    if (restantes.length === 0) {
      onCancelar();
      return;
    }
    setArquivos(restantes);
  }

  return (
    <main className="flex min-h-dvh flex-col bg-bg px-8 pb-9 pt-10 font-corpo text-ink">
      <div className="shrink-0">
        <h1 className="mb-2.5 mt-0 text-balance font-titulo text-[clamp(1.5rem,7vw,1.75rem)] font-medium leading-[1.16] tracking-titulo">
          {arquivos.length === 1 ? "Uma foto para enviar" : `${arquivos.length} fotos para enviar`}
        </h1>
        <p className="m-0 max-w-[34ch] text-[0.94rem] leading-[1.68] text-ink-2">
          {excedeu
            ? `Cada envio leva até ${LIMITE_LOTE} fotos. Ficaram as ${LIMITE_LOTE} primeiras.`
            : "Escolha o momento uma vez, ele vale para todas."}
        </p>
      </div>

      <ul
        className="m-0 mt-7 grid w-full max-w-[28rem] shrink-0 list-none grid-cols-4 gap-2 p-0"
        aria-label="Fotos do envio"
      >
        {miniaturas.map((m, i) => (
          <li key={`${m.arquivo.name}-${m.arquivo.lastModified}-${i}`} className="relative aspect-square">
            {m.url ? (
              <img
                src={m.url}
                alt={`Foto ${i + 1}`}
                className="size-full rounded-superficie object-cover"
              />
            ) : (
              <span className="grid size-full place-items-center rounded-superficie border border-linha text-[0.7rem] text-ink-3">
                Vídeo
              </span>
            )}
            <button
              type="button"
              aria-label={`Tirar a foto ${i + 1} do envio`}
              className="absolute right-1 top-1 grid size-7 cursor-pointer place-items-center rounded-pilula border-0 bg-ink text-[0.9rem] leading-none text-bg focus-visible:outline focus-visible:outline-1 focus-visible:outline-acento focus-visible:outline-offset-2"
              onClick={() => remover(i)}
              disabled={enviando}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {momentos.length > 0 && (
        <div className="mt-9 grid shrink-0 gap-3.5">
          <span className={CLASSE_ROTULO}>{perguntaDoMomento}</span>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              className={cn(CLASSE_MOMENTO, momento === null && "border-acento text-acento-texto")}
              aria-pressed={momento === null}
              onClick={() => setMomento(null)}
            >
              Livre
            </button>
            {momentos.map((m) => (
              <button
                key={m.id}
                type="button"
                className={cn(CLASSE_MOMENTO, momento === m.id && "border-acento text-acento-texto")}
                aria-pressed={momento === m.id}
                onClick={() => setMomento(momento === m.id ? null : m.id)}
              >
                {m.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="mt-9 grid shrink-0 gap-1">
        <span className={CLASSE_ROTULO}>Legenda (opcional)</span>
        <textarea
          className="w-full resize-none border-0 border-b border-linha bg-transparent px-0.5 py-3 font-titulo text-[1.1rem] font-normal leading-[1.42] text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] placeholder:italic placeholder:text-ink-3 focus:border-acento motion-reduce:transition-none"
          value={legenda}
          maxLength={MAX_LEGENDA}
          rows={2}
          placeholder="Conte o que estava acontecendo"
          onChange={(e) => setLegenda(e.target.value.slice(0, MAX_LEGENDA))}
        />
      </label>

      <span className="min-h-10 flex-[1_1_auto]" aria-hidden />

      <div className="grid shrink-0 gap-2">
        <button
          type="button"
          disabled={enviando}
          className="min-h-14 cursor-pointer rounded-pilula border-0 bg-ink px-6 text-[0.97rem] font-medium tracking-rotulo text-bg transition-[transform,opacity] duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:scale-[0.97] disabled:cursor-default disabled:opacity-60 focus-visible:outline focus-visible:outline-1 focus-visible:outline-acento focus-visible:outline-offset-[5px] motion-reduce:transition-none motion-reduce:active:scale-100"
          onClick={() => onEnviar(arquivos, { legenda: legenda.trim() || null, lugar: momento })}
        >
          {rotuloEnviar(arquivos.length)}
        </button>
        <button
          type="button"
          disabled={enviando}
          className="min-h-12 cursor-pointer border-0 bg-transparent font-titulo text-[0.7rem] font-normal uppercase tracking-[0.22em] text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-acento focus-visible:outline-offset-[5px] motion-reduce:transition-none"
          onClick={onCancelar}
        >
          Cancelar
        </button>
      </div>
    </main>
  );
}
