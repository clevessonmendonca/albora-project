"use client";

import type { MediaUrl } from "@/lib/media";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";

/**
 * Parede espelhada antes do gate — layout de `BeforeGateScreen` em `/telas`.
 *
 * Grade 2×N, sem reação, sem comentário, sem stories: a interação ainda não
 * abriu, e desenhar botões trancados mentiria (ADR 0009).
 */

export function MirrorGrid({
  itens,
  urls,
}: {
  itens: readonly ItemVisivel[];
  urls: Map<string, MediaUrl>;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {itens.map((item) => {
        const ehVideo = item.mime.startsWith("video/");
        const url = urls.get(item.chaveThumb)?.url;

        return (
          <div
            key={item.id}
            className="relative aspect-square overflow-hidden rounded-token bg-superficie"
          >
            {url ? (
              ehVideo ? (
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
                  alt={item.legenda ?? ""}
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
