"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HourGroup } from "@/features/feed/lib/group-by-hour";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";

/**
 * Hook para gerenciar o estado do visualizador de fotos.
 * 
 * Responsabilidades:
 * - Controla qual grupo/foto está aberta
 * - Gerencia navegação entre fotos
 * - Marca grupos como vistos
 * - Controla overflow do body quando viewer está aberto
 * - Salva e restaura posição do scroll com smooth scroll (respeitando prefers-reduced-motion)
 */

type Aberto = { inicio: number; itemId: string };

type ViewerState = {
  grupoAberto: HourGroup<ItemVisivel> | null;
  indiceAtual: number;
  vistos: ReadonlySet<number>;
};

export function useFeedViewer(grupos: HourGroup<ItemVisivel>[]) {
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const [preparando, setPreparando] = useState<number | null>(null);
  const [vistos, setVistos] = useState<ReadonlySet<number>>(() => new Set());
  const scrollSalvo = useRef<number | null>(null);
  const itensRef = useRef<ItemVisivel[]>([]);

  const grupoAberto = aberto
    ? grupos.find((g) => g.inicio.getTime() === aberto.inicio)
    : null;

  const itensAbertos = grupoAberto?.itens ?? [];
  itensRef.current = itensAbertos;
  const achado = grupoAberto ? itensAbertos.findIndex((i) => i.id === aberto?.itemId) : -1;
  const indiceAtual = achado >= 0 ? achado : 0;

  const abrir = useCallback((grupo: HourGroup<ItemVisivel>) => {
    scrollSalvo.current = window.scrollY;
    
    const inicio = grupo.inicio.getTime();
    const primeiro = grupo.itens[0];

    setVistos((antes) => (antes.has(inicio) ? antes : new Set(antes).add(inicio)));

    if (grupo.completo && primeiro) {
      setAberto({ inicio, itemId: primeiro.id });
    } else {
      setPreparando(inicio);
    }
  }, []);

  const fechar = useCallback(() => {
    setAberto(null);
    
    if (scrollSalvo.current !== null) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ 
        top: scrollSalvo.current, 
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
      scrollSalvo.current = null;
    }
  }, []);

  const navegarPara = useCallback(
    (indice: number) => {
      const alvo = itensRef.current[indice];
      if (!alvo) return;
      setAberto((atual) => (atual ? { inicio: atual.inicio, itemId: alvo.id } : atual));
    },
    [],
  );

  // Fecha hora incompleta antes de abrir
  useEffect(() => {
    if (preparando === null) return;

    const grupo = grupos.find((g) => g.inicio.getTime() === preparando);
    if (!grupo) {
      setPreparando(null);
      return;
    }

    if (!grupo.completo) return;

    const primeiro = grupo.itens[0];
    setPreparando(null);
    if (primeiro) setAberto({ inicio: preparando, itemId: primeiro.id });
  }, [preparando, grupos]);

  // Fecha viewer se grupo desaparecer (ex: pânico)
  useEffect(() => {
    if (aberto && !grupoAberto) setAberto(null);
  }, [aberto, grupoAberto]);

  // Controla overflow do body quando viewer está aberto
  useEffect(() => {
    if (!grupoAberto) return;

    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [grupoAberto]);

  return {
    grupoAberto,
    indiceAtual,
    itensAbertos,
    vistos,
    preparando,
    abrir,
    fechar,
    navegarPara,
  };
}
