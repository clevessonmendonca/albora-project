"use client";

import { useEffect, useState } from "react";
import {
  ADMIN_TEMA_CLASSE,
  cookieParaEscolha,
  escolhaDoDataset,
  type EscolhaDeTema,
} from "@/features/admin/lib/tema-do-painel";

const OPCOES: { valor: EscolhaDeTema; rotulo: string }[] = [
  { valor: "light", rotulo: "Claro" },
  { valor: "dark", rotulo: "Escuro" },
  { valor: "system", rotulo: "Sistema" },
];

/** Começa em "system" e corrige um frame depois. O anti-flash mora no shell, que lê o cookie no servidor — aqui só reflete a escolha. */
export function TemaDoPainelToggle() {
  const [escolha, setEscolha] = useState<EscolhaDeTema>("system");

  useEffect(() => {
    const raiz = document.querySelector<HTMLElement>(`.${ADMIN_TEMA_CLASSE}`);
    setEscolha(escolhaDoDataset(raiz?.dataset.tema));
  }, []);

  function escolher(proxima: EscolhaDeTema) {
    const raiz = document.querySelector<HTMLElement>(`.${ADMIN_TEMA_CLASSE}`);
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
      {OPCOES.map(({ valor, rotulo }) => {
        const ativa = valor === escolha;
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={ativa}
            onClick={() => escolher(valor)}
            className={`min-h-11 cursor-pointer rounded-pilula border-none px-3 text-[0.8125rem] transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
              ativa
                ? "bg-superficie-alta font-titulo text-acento-texto"
                : "bg-transparent text-ink-3 hover:text-ink"
            }`}
          >
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}
