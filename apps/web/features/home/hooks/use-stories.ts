"use client";

import { useEffect, useRef, useState } from "react";
import type { StoryItem } from "@albora/ui-web";
import { mediaUrls, type MediaUrl } from "@/lib/media";

/** Story de `/api/stories`: id, primeiro nome do autor (concessão `ler.identidade`) e chave da miniatura — sem URL (assinatura é separada). */
export type StoryDaRede = {
  id: string;
  autor: string;
  chaveThumb: string;
  sessaoId?: string | undefined;
};

export type EstadoStories = {
  itens: StoryDaRede[];
  urls: Map<string, MediaUrl>;
  carregado: boolean;
};

export function estadoInicialStories(): EstadoStories {
  return { itens: [], urls: new Map(), carregado: false };
}

/** Busca stories ativas — nunca lança (degrada para lista vazia em falha de rede ou não-2xx). */
export async function buscarStories(): Promise<StoryDaRede[]> {
  try {
    const res = await fetch("/api/stories", { credentials: "same-origin" });
    if (!res.ok) return [];

    const corpo = (await res.json()) as { itens?: StoryDaRede[] };
    return Array.isArray(corpo.itens) ? corpo.itens : [];
  } catch {
    return [];
  }
}

/** Story para `StoryRail`; `capaUrl` é `undefined` (não `null`) quando URL não chegou — `StorySquircle` cai nas iniciais sem erro visível. */
export function paraStoryItem(story: StoryDaRede, urls: Map<string, MediaUrl>): StoryItem {
  return { id: story.id, nome: story.autor, capaUrl: urls.get(story.chaveThumb)?.url };
}

/** Stories do evento para o rail — dois passos de rede (lista via `/api/stories`, URL via `mediaUrls`); reusa o mesmo resolvedor de assinatura do feed. */
const POLL_MS = 30_000;

export function useStories(): EstadoStories {
  const [estado, setEstado] = useState<EstadoStories>(estadoInicialStories);
  const geracao = useRef(0);

  useEffect(() => {
    async function atualizar() {
      const minha = ++geracao.current;

      const itens = await buscarStories();
      if (minha !== geracao.current) return;
      setEstado((e) => ({ ...e, itens, carregado: true }));

      const chaves = itens.map((i) => i.chaveThumb);
      if (chaves.length === 0) return;

      try {
        const urls = await mediaUrls(chaves);
        if (minha !== geracao.current) return;
        setEstado((e) => ({ ...e, urls }));
      } catch {
        // Enriquecimento: sem URL assinada, a story cai nas iniciais — não bloqueia a Home.
      }
    }

    void atualizar();
    const intervalo = setInterval(() => void atualizar(), POLL_MS);
    return () => clearInterval(intervalo);
  }, []);

  return estado;
}
