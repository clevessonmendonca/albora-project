"use client";

import React, { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  ADMIN_ROOT_ID,
  cookieParaEscolha,
  escolhaDoDataset,
  type EscolhaDeTema,
} from "@/features/admin/lib/tema-do-painel";

const OPCOES: { valor: EscolhaDeTema; rotulo: string; Icone: typeof Sun }[] = [
  { valor: "light", rotulo: "Claro", Icone: Sun },
  { valor: "dark", rotulo: "Escuro", Icone: Moon },
  { valor: "system", rotulo: "Sistema", Icone: Monitor },
];

/** Começa em "system" e corrige um frame depois. O anti-flash mora no shell, que lê o cookie no servidor — aqui só reflete. */
export function TemaDoPainelToggle() {
  const [escolha, setEscolha] = useState<EscolhaDeTema>("system");

  useEffect(() => {
    const raiz = document.getElementById(ADMIN_ROOT_ID);
    setEscolha(escolhaDoDataset(raiz?.dataset.tema));
  }, []);

  function escolher(proxima: EscolhaDeTema) {
    const raiz = document.getElementById(ADMIN_ROOT_ID);
    if (proxima === "system") raiz?.removeAttribute("data-tema");
    else if (raiz) raiz.dataset.tema = proxima;

    document.cookie = cookieParaEscolha(proxima);
    setEscolha(proxima);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Aparência do painel"
      className="flex shrink-0 items-center gap-0.5 rounded-pilula border border-linha p-0.5"
    >
      {OPCOES.map(({ valor, rotulo, Icone }) => {
        const ativa = valor === escolha;
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={ativa}
            title={rotulo}
            onClick={() => escolher(valor)}
            className={`grid size-11 cursor-pointer place-items-center rounded-pilula border-none transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
              ativa ? "bg-superficie-alta font-titulo text-acento-texto" : "bg-transparent text-ink-3 hover:text-ink"
            }`}
          >
            <Icone size={16} aria-hidden />
            <span className="sr-only">{rotulo}</span>
          </button>
        );
      })}
    </div>
  );
}
