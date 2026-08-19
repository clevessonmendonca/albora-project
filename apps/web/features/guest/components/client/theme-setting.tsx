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

/**
 * Config de aparência do convidado, dentro de "Minhas" — substitui o botão
 * sol/lua que ficava fixo em toda tela. Mesma lógica de sempre: `data-tema`
 * em `#guest-root` + cookie (`guest-theme.ts`); só que atrás de uma escolha
 * explícita de 3 vias, não de um toggle sempre visível.
 *
 * O estado inicial assume "system" e se corrige para o que já está no DOM
 * assim que monta — o fundo da página nunca pisca (isso já é resolvido pelo
 * `<style>` anti-flash do layout, antes deste componente existir); o pior
 * caso aqui é o rádio certo acender um frame depois.
 */
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
              className={`min-h-[3.375rem] flex-1 rounded-token text-[0.8125rem] font-medium ${
                ativa ? "bg-superficie-alta text-ink" : "text-ink-2"
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
