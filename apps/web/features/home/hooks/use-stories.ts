"use client";

import { useEffect, useRef, useState } from "react";
import type { StoryItem } from "@albora/ui-web";
import { mediaUrls, type MediaUrl } from "@/lib/media";

/**
 * Uma story real, do jeito que `/api/stories` devolve — id, primeiro nome do
 * autor (a mesma concessão `ler.identidade` do comentário/reação, nunca mais
 * que isso) e a chave da miniatura. Sem URL: a rota de stories não assina
 * nada, a mesma separação que o feed já faz entre "o que é a foto" e "onde
 * buscar o byte".
 */
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

/**
 * Busca as stories ativas do evento da sessão.
 *
 * Nunca lança. Story é enriquecimento da Home (CLAUDE.md, "degrada, nunca
 * falha"): uma falha de rede ou uma resposta que não é 2xx devolve lista
 * vazia, do mesmo jeito que "sem stories agora" — a Home não tem por que
 * mostrar um aviso de erro para a tira do topo quando o feed embaixo segue
 * funcionando normalmente.
 */
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

/**
 * Uma story pronta para `StoryRail` — `nome` e `capaUrl` no formato que o
 * componente do kit espera. `capaUrl` fica `undefined` (não `null`) quando a
 * URL ainda não chegou ou a busca de URL falhou: `StorySquircle` já cai nas
 * iniciais nesse caso, sem estado de erro visível — a mesma degradação da
 * story inteira, um nível abaixo.
 */
export function paraStoryItem(story: StoryDaRede, urls: Map<string, MediaUrl>): StoryItem {
  return { id: story.id, nome: story.autor, capaUrl: urls.get(story.chaveThumb)?.url };
}

/**
 * As stories reais do evento, para o rail da Home.
 *
 * Dois passos de rede, não um: `/api/stories` devolve a lista (id, autor,
 * chave), e a URL assinada da miniatura vem de `mediaUrls` — o MESMO
 * resolvedor que o feed usa para as fotos do mural. Um lote separado da
 * primeira página do feed, porque é uma resposta diferente (`storiesAtivasDoEvento`,
 * não `listarFeed`); reaproveitar o mecanismo de assinatura evita um segundo
 * caminho de URL com as mesmas garantias de TTL só reescrito.
 */
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
