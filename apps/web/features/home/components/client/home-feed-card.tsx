"use client";

import React from "react";
import type { ModoInteracao } from "@albora/core";
import { isVideoMime } from "@albora/core";
import Link from "next/link";
import { Post } from "@/features/feed/components/client/post";
import type { ResultadoReacao } from "@/features/feed/hooks/use-reaction";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";

export function HomeFeedCard({
  item,
  url,
  interacao,
  base,
  onReacoes,
  onAbrir,
  onVerAutor,
}: {
  item: ItemVisivel;
  url: string | null;
  interacao: ModoInteracao;
  base: string;
  onReacoes: (uploadId: string, resultado: ResultadoReacao) => void;
  onAbrir: () => void;
  onVerAutor: (sessaoId: string) => void;
}) {
  const isVideo = isVideoMime(item.mime);

  return (
    <Post
      uploadId={item.id}
      interacao={interacao}
      {...(item.reacoes !== undefined ? { reacoes: item.reacoes } : {})}
      {...(item.minhaReacao !== undefined ? { minhaReacao: item.minhaReacao } : {})}
      {...(item.sessaoAutor ? { sessaoAutor: item.sessaoAutor } : {})}
      {...(item.sessaoAutor
        ? {
            autorHref: `${base}/g/${encodeURIComponent(item.sessaoAutor)}`,
            linkComponent: Link,
            onVerAutor,
          }
        : {})}
      {...(item.minha !== undefined ? { minha: item.minha } : {})}
      onReacoes={(resultado) => onReacoes(item.id, resultado)}
      onAbrir={onAbrir}
      url={url}
      autor={item.autor}
      legenda={item.legenda}
      lugar={item.lugar}
      criadaEm={item.criadaEm}
      isVideo={isVideo}
      {...(item.largura !== undefined ? { largura: item.largura } : {})}
      {...(item.altura !== undefined ? { altura: item.altura } : {})}
    />
  );
}
