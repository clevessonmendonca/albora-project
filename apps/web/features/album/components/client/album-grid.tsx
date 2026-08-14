"use client";

import type { MediaUrl } from "@/lib/media";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";

/**
 * Grade 3×N do álbum — layout de `AlbumScreen` em `/telas`.
 *
 * Gap de 2px, células quadradas, sem crop enganoso: o convidado reconhece a
 * mecânica do Instagram dentro do evento.
 */

export function AlbumGrid({
  itens,
  urls,
  onAbrir,
}: {
  itens: readonly ItemVisivel[];
  urls: Map<string, MediaUrl>;
  onAbrir: (indice: number) => void;
}) {
  return (
    <ul className="m-0 grid list-none grid-cols-3 gap-0.5 p-0">
      {itens.map((item, indice) => {
        const ehVideo = item.mime.startsWith("video/");
        const url = urls.get(item.chaveThumb)?.url;

        return (
          <li key={item.id}>
            <button
              type="button"
              aria-label={ehVideo ? "Abrir vídeo" : "Abrir foto"}
              onClick={() => onAbrir(indice)}
              className="relative block aspect-square w-full cursor-pointer overflow-hidden border-0 bg-superficie p-0 font-[inherit]"
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
                    <IndicadorVideo />
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
                <span className="album-esperando block size-full bg-linha" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function AlbumGridLoading() {
  return (
    <ul
      aria-hidden
      className="m-0 grid list-none grid-cols-3 gap-0.5 p-0"
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <li key={i}>
          <span className="album-esperando block aspect-square bg-linha" />
        </li>
      ))}
    </ul>
  );
}

function IndicadorVideo() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 grid place-items-center bg-gradient-video-scrim"
    >
      <span className="grid size-8 place-items-center rounded-full border border-linha bg-bg-vidro text-xs">
        ▶
      </span>
    </span>
  );
}
