"use client";

import { useEffect, useState } from "react";
import {
  cookieParaEscolha,
  escolhaDoDataset,
  GUEST_ROOT_ID,
  type GuestThemeChoice,
} from "@/features/guest/lib/guest-theme";

const OPCOES: { valor: GuestThemeChoice; rotulo: string }[] = [
  { valor: "light", rotulo: "Claro" },
  { valor: "dark", rotulo: "Escuro" },
  { valor: "system", rotulo: "Sistema" },
];

/** O estado inicial assume "system" e corrigi um frame depois — o anti-flash fica no layout, não aqui. */
export function ThemeSetting() {
  const [escolha, setEscolha] = useState<GuestThemeChoice>("system");

  useEffect(() => {
    const root = document.getElementById(GUEST_ROOT_ID);
    setEscolha(escolhaDoDataset(root?.dataset.tema));
  }, []);

  function escolher(proxima: GuestThemeChoice) {
    const root = document.getElementById(GUEST_ROOT_ID);
    if (proxima === "system") {
      root?.removeAttribute("data-tema");
    } else if (root) {
      root.dataset.tema = proxima;
    }
    document.cookie = cookieParaEscolha(proxima);
    setEscolha(proxima);
  }

  return (
    <div className="px-[1.125rem] pb-3.5">
      <p className="mb-2 text-[0.6875rem] uppercase tracking-titulo text-ink-2">Aparência</p>
      <div role="radiogroup" aria-label="Tema" className="flex gap-1.5 rounded-token bg-superficie p-1">
        {OPCOES.map((opcao) => {
          const ativa = opcao.valor === escolha;
          return (
            <button
              key={opcao.valor}
              type="button"
              role="radio"
              aria-checked={ativa}
              onClick={() => escolher(opcao.valor)}
              className={`min-h-[3.375rem] flex-1 rounded-token text-[0.8125rem] font-medium transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                ativa ? "bg-superficie-alta text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {opcao.rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}
