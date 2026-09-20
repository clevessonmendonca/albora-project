"use client";

import React from "react";
import { isVideoMime } from "@albora/core";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";

export function PhotoGrid({
  itens,
  urls,
  autor,
  onAbrir,
}: {
  itens: ItemVisivel[];
  urls: { get: (chave: string) => { url: string } | undefined };
  autor: string;
  onAbrir: (indice: number) => void;
}) {
  return (
    <ul className="mt-1 grid list-none grid-cols-3 gap-1 p-0" aria-label={`Fotos de ${autor}`}>
      {itens.map((item, indice) => {
        const url = urls.get(item.chaveThumb)?.url ?? null;
        const video = isVideoMime(item.mime);
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onAbrir(indice)}
              data-testid={`profile-photo-${item.id}`}
              aria-label={
                video
                  ? `Vídeo de ${autor}, ${indice + 1} de ${itens.length}`
                  : `Foto de ${autor}, ${indice + 1} de ${itens.length}`
              }
              className="relative block aspect-square w-full cursor-pointer overflow-hidden bg-superficie-alta p-0 transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90"
            >
              {url ? (
                <img
                  src={url}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span aria-hidden className="block size-full bg-ink-skeleton" />
              )}
              {video && (
                <span className="absolute bottom-1.5 right-1.5 rounded-pilula bg-bg/80 px-1.5 py-0.5 text-[0.5625rem] uppercase tracking-rotulo text-ink">
                  vídeo
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
