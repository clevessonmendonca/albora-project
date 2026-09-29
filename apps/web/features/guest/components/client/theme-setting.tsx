"use client";

import { useEffect, useState } from "react";
import {
  cookieParaEscolha,
  escolhaDoDataset,
  GUEST_ROOT_ID,
  type GuestThemeChoice,
} from "@/features/guest/lib/guest-theme";

type EscolhaVisivel = Exclude<GuestThemeChoice, "system">;

/**
 * Duas opções, não três.
 *
 * O painel oferece "Sistema" porque lá o piso é o do sistema. Aqui o piso é
 * escuro por contexto de uso — a festa é à noite —, e a cascata do convidado
 * não consulta `prefers-color-scheme`. Uma opção "Sistema" entregaria escuro
 * em qualquer aparelho: seria um controle que diz uma coisa e faz outra.
 */
const OPCOES: { valor: EscolhaVisivel; rotulo: string }[] = [
  { valor: "dark", rotulo: "Escuro" },
  { valor: "light", rotulo: "Claro" },
];

/** Começa no escuro — o piso — e corrige um frame depois; o anti-flash fica no layout, não aqui. */
export function ThemeSetting() {
  const [escolha, setEscolha] = useState<EscolhaVisivel>("dark");

  useEffect(() => {
    const root = document.getElementById(GUEST_ROOT_ID);
    const doDataset = escolhaDoDataset(root?.dataset.tema);
    setEscolha(doDataset === "system" ? "dark" : doDataset);
  }, []);

  function escolher(proxima: EscolhaVisivel) {
    const root = document.getElementById(GUEST_ROOT_ID);
    if (root) root.dataset.tema = proxima;
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
