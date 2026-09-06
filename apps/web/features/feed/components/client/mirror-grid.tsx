"use client";

import React from "react";
import { isVideoMime } from "@albora/core";
import type { MediaUrl } from "@/lib/media";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";

/** Antes do gate — sem reação, sem comentário: desenhar botões trancados mentiria (ADR 0009). O toque abre o viewer; a estrela vive lá, respeitando o gate. */

export function MirrorGrid({
  itens,
  urls,
  cameraPath,
  onAbrir,
}: {
  itens: readonly ItemVisivel[];
  urls: Map<string, MediaUrl>;
  cameraPath?: string;
  onAbrir: (indice: number) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        {itens.map((item, indice) => {
          const isVideo = isVideoMime(item.mime);
          const url = urls.get(item.chaveThumb)?.url;
          const rotulo = isVideo
            ? `Abrir vídeo de ${item.autor}`
            : `Abrir foto de ${item.autor}`;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onAbrir(indice)}
              data-testid={`mirror-photo-${item.id}`}
              aria-label={rotulo}
              className="relative aspect-square cursor-pointer overflow-hidden rounded-media border-0 bg-superficie-alta p-0 transition-transform duration-instantaneo ease-mola active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {url ? (
                isVideo ? (
                  <>
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="block size-full object-cover"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 grid place-items-center bg-overlay-video"
                    >
                      <span className="grid size-8 place-items-center rounded-full border border-linha bg-bg-vidro text-xs">
                        ▶
                      </span>
                    </span>
                  </>
                ) : (
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="block size-full object-cover"
                  />
                )
              ) : (
                <div className="feed-esperando size-full border border-linha" />
              )}
            </button>
          );
        })}
      </div>
      {cameraPath && (
        <a
          href={cameraPath}
          className="flex min-h-12 items-center justify-center rounded-pilula bg-acento px-6 text-[0.9375rem] font-medium text-sobre-acento shadow-suave no-underline transition-transform duration-instantaneo ease-mola hover:opacity-90 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Tirar foto
        </a>
      )}
    </div>
  );
}

export function MirrorGridLoading() {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="feed-esperando aspect-square rounded-media bg-superficie-alta" />
      ))}
    </div>
  );
}
