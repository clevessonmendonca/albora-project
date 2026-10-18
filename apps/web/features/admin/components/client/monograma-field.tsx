"use client";

import React, { useState } from "react";
import { MONOGRAMA_MAXIMO, opcoesDeMonograma, sanearMonograma } from "@albora/core";

const CARTAO =
  "flex min-h-[3.25rem] min-w-[4.5rem] cursor-pointer flex-col items-start justify-center gap-0.5 rounded-token p-3 text-left transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]";

function cartaoClasses(ativo: boolean): string {
  return `${CARTAO} ${ativo ? "border-2 border-acento bg-superficie-alta" : "border border-linha bg-bg hover:border-acento-texto"}`;
}

/** `value` null = o anfitrião ainda não escolheu (vale o padrão do evento); "" = sem monograma. As opções vêm das iniciais do nome. */
export function MonogramaField({
  value,
  onChange,
  nome,
}: {
  value: string | null;
  onChange: (next: string) => void;
  nome: string;
}) {
  const opcoes = opcoesDeMonograma(nome);
  const correspondente = value === null ? undefined : opcoes.find((o) => o.valor === value);
  const personalizado = value !== null && !correspondente;
  const [modoPersonalizado, setModoPersonalizado] = useState(personalizado);
  const ativoPersonalizado = modoPersonalizado || personalizado;

  return (
    <div>
      <p className="tipo-label m-0 mb-2 text-ink-2" id="monograma-rotulo">
        Monograma
      </p>
      <div role="radiogroup" aria-labelledby="monograma-rotulo" className="flex flex-wrap gap-2">
        {opcoes.map((o) => {
          const ativo = !ativoPersonalizado && value === o.valor;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => {
                setModoPersonalizado(false);
                onChange(o.valor);
              }}
              className={cartaoClasses(ativo)}
            >
              <span className={o.valor ? "font-titulo text-lg text-ink" : "tipo-label text-ink-2"}>
                {o.rotulo}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={ativoPersonalizado}
          onClick={() => {
            setModoPersonalizado(true);
            if (value === null || correspondente) onChange("");
          }}
          className={cartaoClasses(ativoPersonalizado)}
        >
          <span className="tipo-label text-ink-2">Personalizado</span>
        </button>
      </div>
      {ativoPersonalizado && (
        <input
          aria-label="Monograma personalizado"
          value={value ?? ""}
          maxLength={MONOGRAMA_MAXIMO}
          placeholder="Até 8 caracteres"
          onChange={(e) => onChange(sanearMonograma(e.target.value.slice(0, MONOGRAMA_MAXIMO)) ?? "")}
          className="tipo-corpo mt-2 h-10 w-full max-w-[12rem] rounded-token border border-linha bg-superficie px-3 text-ink"
        />
      )}
      <p className="tipo-caption m-0 mt-2 text-ink-3">
        Aparece nas placas, nos cartões e na moldura das fotos. Sem escolha, usamos as iniciais da festa.
      </p>
    </div>
  );
}
