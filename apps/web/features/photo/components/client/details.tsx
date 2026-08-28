"use client";

import { cn } from "@albora/ui-web";
import { useState } from "react";

/** Legenda e lugar enquanto a foto já sobe — os dois botões levam ao mesmo lugar: tela opcional que parece obrigatória vira obrigatória (N6.8). */

export type Place = { id: string; title: string };

const MAX_LEGENDA = 280;

const CLASSE_ROTULO =
  "font-titulo text-[0.7rem] font-normal uppercase tracking-[0.28em] text-ink-3";

const CLASSE_LUGAR =
  "min-h-12 cursor-pointer rounded-pilula border border-linha bg-transparent px-[1.15rem] font-titulo text-[0.9rem] font-normal text-ink-2 transition-[color,border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-acento focus-visible:outline-offset-[5px] motion-reduce:transition-none";

export function Details({
  places,
  perguntaDoLugar,
  lugarInicial = null,
  onPronto,
}: {
  places: Place[];
  perguntaDoLugar: string;
  lugarInicial?: string | null;
  onPronto: (detalhes: { legenda: string | null; lugar: string | null }) => void;
}) {
  const [legenda, setLegenda] = useState("");
  const [lugar, setLugar] = useState<string | null>(lugarInicial);

  const concluir = () =>
    onPronto({ legenda: legenda.trim() || null, lugar });

  return (
    <main className="flex min-h-dvh flex-col bg-bg px-8 pb-9 pt-10 font-corpo text-ink">
      <div className="shrink-0">
        <h1 className="mb-2.5 mt-0 text-balance font-titulo text-[clamp(1.5rem,7vw,1.75rem)] font-medium leading-[1.16] tracking-titulo">
          Sua foto já está subindo
        </h1>
        <p className="m-0 max-w-[34ch] text-[0.94rem] leading-[1.68] text-ink-2">
          Se quiser, conte alguma coisa sobre ela.
        </p>
      </div>

      <label className="mt-9 grid shrink-0 gap-1">
        <span className={CLASSE_ROTULO}>Legenda (opcional)</span>
        <textarea
          className="w-full resize-none border-0 border-b border-linha bg-transparent px-0.5 py-3 font-titulo text-[1.1rem] font-normal leading-[1.42] text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] placeholder:italic placeholder:text-ink-3 focus:border-acento motion-reduce:transition-none"
          value={legenda}
          maxLength={MAX_LEGENDA}
          onChange={(e) => setLegenda(e.target.value.slice(0, MAX_LEGENDA))}
          rows={2}
          placeholder="Uma noite que ninguém esquece"
        />
        {legenda.length > 0 && (
          <span className="text-right text-[0.6875rem] tabular-nums text-ink-3">
            {MAX_LEGENDA - legenda.length}
          </span>
        )}
      </label>

      <div className="mt-9 grid shrink-0 gap-3.5">
        <span className={CLASSE_ROTULO}>{perguntaDoLugar}</span>
        <div className="flex flex-wrap gap-2.5">
          {places.map((l) => (
            <button
              key={l.id}
              type="button"
              className={cn(
                CLASSE_LUGAR,
                lugar === l.id && "border-acento text-acento-texto",
              )}
              onClick={() => setLugar(lugar === l.id ? null : l.id)}
              aria-pressed={lugar === l.id}
            >
              {l.title}
            </button>
          ))}
        </div>
      </div>

      <span className="min-h-10 flex-[1_1_auto]" aria-hidden />

      <div className="grid shrink-0 gap-2">
        <button
          type="button"
          className="min-h-14 cursor-pointer rounded-pilula border-0 bg-ink px-6 text-[0.97rem] font-medium tracking-rotulo text-bg transition-[transform,opacity] duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:scale-[0.97] focus-visible:outline focus-visible:outline-1 focus-visible:outline-acento focus-visible:outline-offset-[5px] motion-reduce:transition-none motion-reduce:active:scale-100"
          onClick={concluir}
        >
          Pronto
        </button>
        <button
          type="button"
          className="min-h-12 cursor-pointer border-0 bg-transparent font-titulo text-[0.7rem] font-normal uppercase tracking-[0.22em] text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-acento focus-visible:outline-offset-[5px] motion-reduce:transition-none"
          onClick={concluir}
        >
          Pular
        </button>
      </div>
    </main>
  );
}
