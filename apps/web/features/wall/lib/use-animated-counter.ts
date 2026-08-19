"use client";

import { useEffect, useState } from "react";
import { proximoValorExibido } from "./animated-counter";

const INTERVALO_MS = 60;

function movimentoReduzido(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Sobe o número exibido até `alvo` (spec A4). Pula direto para `alvo` sob
 * `prefers-reduced-motion: reduce` — o produto não depende da animação para
 * comunicar o valor, só a usa quando o sistema permite.
 */
export function useContadorAoVivo(alvo: number): number {
  const [exibido, setExibido] = useState(alvo);

  useEffect(() => {
    if (movimentoReduzido()) {
      setExibido(alvo);
      return;
    }

    const id = window.setInterval(() => {
      setExibido((atual) => {
        const proximo = proximoValorExibido(atual, alvo);
        if (proximo === atual) window.clearInterval(id);
        return proximo;
      });
    }, INTERVALO_MS);

    return () => window.clearInterval(id);
  }, [alvo]);

  return exibido;
}
