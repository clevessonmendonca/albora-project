"use client";

import { isVideoMime } from "@albora/core";
import type { MediaUrl } from "@/lib/media";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";

/** Antes do gate — sem reação, sem comentário: desenhar botões trancados mentiria (ADR 0009). */

export function MirrorGrid({
  itens,
  urls,
  cameraPath,
}: {
  itens: readonly ItemVisivel[];
  urls: Map<string, MediaUrl>;
  cameraPath?: string;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-1.5">
        {itens.map((item) => {
          const isVideo = isVideoMime(item.mime);
          const url = urls.get(item.chaveThumb)?.url;

          return (
            <div
              key={item.id}
              className="relative aspect-square overflow-hidden rounded-token bg-superficie"
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
                    alt={item.legenda ?? `Foto de ${item.autor}`}
                    loading="lazy"
                    decoding="async"
                    className="block size-full object-cover"
                  />
                )
              ) : (
                <div className="feed-esperando size-full border border-linha" />
              )}
            </div>
          );
        })}
      </div>
      {cameraPath && (
        <a
          href={cameraPath}
          className="flex min-h-12 items-center justify-center rounded-pilula bg-acento px-6 text-[0.9375rem] font-medium text-sobre-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80"
        >
          Tirar foto
        </a>
      )}
    </div>
  );
}

export function MirrorGridLoading() {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-1.5">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="feed-esperando aspect-square rounded-token border border-linha"
        />
      ))}
    </div>
  );
}
