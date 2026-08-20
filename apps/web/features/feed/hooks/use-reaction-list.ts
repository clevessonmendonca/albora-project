"use client";

import { useCallback, useState } from "react";

type Estado = {
  aberto: boolean;
  carregando: boolean;
  nomes: string[];
  erro: string | null;
};

/**
 * Lista simples de quem curtiu (spec social §5.5) — carrega sob demanda ao
 * abrir o sheet, nunca no render inicial do feed.
 */
export function useReactionList(uploadId: string) {
  const [estado, setEstado] = useState<Estado>({
    aberto: false,
    carregando: false,
    nomes: [],
    erro: null,
  });

  const fechar = useCallback(() => {
    setEstado((atual) => ({ ...atual, aberto: false }));
  }, []);

  const abrir = useCallback(async () => {
    setEstado({ aberto: true, carregando: true, nomes: [], erro: null });
    try {
      const res = await fetch(`/api/reaction?uploadId=${encodeURIComponent(uploadId)}`, {
        credentials: "same-origin",
      });
      const corpo = (await res.json()) as { nomes?: string[]; mensagem?: string };
      if (!res.ok) {
        setEstado((atual) => ({
          ...atual,
          carregando: false,
          erro: corpo.mensagem ?? "Não deu para carregar agora.",
        }));
        return;
      }
      setEstado((atual) => ({
        ...atual,
        carregando: false,
        nomes: corpo.nomes ?? [],
      }));
    } catch {
      setEstado((atual) => ({
        ...atual,
        carregando: false,
        erro: "Sem sinal. Tenta de novo quando voltar.",
      }));
    }
  }, [uploadId]);

  return { ...estado, abrir, fechar };
}

export type ReactionListController = ReturnType<typeof useReactionList>;
