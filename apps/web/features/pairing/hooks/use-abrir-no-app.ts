import { useCallback, useEffect, useRef, useState } from "react";

export const ESPERA_ABRIR_APP_MS = 1800;

export function useAbrirNoApp(link: string | null) {
  const [semApp, setSemApp] = useState(false);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limpar = useCallback(() => {
    if (relogio.current !== null) clearTimeout(relogio.current);
    relogio.current = null;
  }, []);

  useEffect(() => {
    const saiu = () => {
      if (document.visibilityState === "hidden") limpar();
    };
    document.addEventListener("visibilitychange", saiu);
    window.addEventListener("pagehide", limpar);
    return () => {
      document.removeEventListener("visibilitychange", saiu);
      window.removeEventListener("pagehide", limpar);
      limpar();
    };
  }, [limpar]);

  const abrir = useCallback(() => {
    if (!link) return;
    setSemApp(false);
    limpar();
    relogio.current = setTimeout(() => {
      relogio.current = null;
      if (document.visibilityState === "visible") setSemApp(true);
    }, ESPERA_ABRIR_APP_MS);
    window.location.href = link;
  }, [link, limpar]);

  return { abrir, semApp };
}
