"use client";

import { MoonIcon, SunIcon } from "@albora/ui-web";
import { useEffect, useState } from "react";
import {
  readThemePreference,
  THEME_COOKIE,
  type ThemePreference,
} from "@/features/guest/lib/theme-preference";

const GUEST_ROOT_ID = "guest-root";
const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

function temaDoSistema(): ThemePreference {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * O tema que está de fato na tela agora: o `data-tema` explícito do
 * container, ou — sem override — o que a media query do sistema decidiu.
 * Espelha exatamente a cascata CSS do `<style>` anti-flash do layout, para o
 * ícone nunca discordar do fundo renderizado.
 */
function temaEfetivo(): ThemePreference {
  const root = document.getElementById(GUEST_ROOT_ID);
  return readThemePreference(root?.dataset.tema) ?? temaDoSistema();
}

/**
 * Botão sol/lua do convidado.
 *
 * `preferenciaServidor` é o `data-tema` que o layout já decidiu no servidor
 * (cookie lido antes do primeiro byte). Presente, ele é a fonte inicial —
 * zero divergência com o que já está na tela. Ausente (sem cookie ainda), o
 * primeiro render assume o padrão da marca e corrige para o tema do sistema
 * logo após montar; a página em si não pisca, porque essa parte já foi
 * decidida em CSS puro antes deste componente existir.
 */
export function ThemeController({
  preferenciaServidor,
}: {
  preferenciaServidor?: ThemePreference | null;
}) {
  const [tema, setTema] = useState<ThemePreference>(preferenciaServidor ?? "dark");

  useEffect(() => {
    if (preferenciaServidor) return;
    setTema(temaEfetivo());

    const consulta = window.matchMedia("(prefers-color-scheme: dark)");
    const acompanharSistema = () => {
      const root = document.getElementById(GUEST_ROOT_ID);
      if (readThemePreference(root?.dataset.tema)) return;
      setTema(temaDoSistema());
    };
    consulta.addEventListener("change", acompanharSistema);
    return () => consulta.removeEventListener("change", acompanharSistema);
  }, [preferenciaServidor]);

  function alternar() {
    const root = document.getElementById(GUEST_ROOT_ID);
    if (!root) return;

    const proximo: ThemePreference = temaEfetivo() === "dark" ? "light" : "dark";
    root.dataset.tema = proximo;
    document.cookie = `${THEME_COOKIE}=${proximo}; path=/; max-age=${UM_ANO_EM_SEGUNDOS}; SameSite=Lax; Secure`;
    setTema(proximo);
  }

  const escuro = tema === "dark";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? "Mudar para tema claro" : "Mudar para tema escuro"}
      aria-pressed={escuro}
      className="fixed right-4 z-40 grid size-[3.375rem] place-items-center rounded-full border border-linha bg-superficie-alta text-ink"
      style={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
    >
      {escuro ? <SunIcon size={22} /> : <MoonIcon size={22} />}
    </button>
  );
}
