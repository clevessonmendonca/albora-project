"use client";

import type { UrlDeMidia } from "@/lib/midia";
import type { ItemVisivel } from "@/lib/usar-feed";

/**
 * Grade 3×N do álbum — layout de `TelaAlbum` em `/telas`.
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
  urls: Map<string, UrlDeMidia>;
  onAbrir: (indice: number) => void;
}) {
  return (
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "2px",
      }}
    >
      {itens.map((item, indice) => {
        const ehVideo = item.mime.startsWith("video/");
        const url = urls.get(item.chaveThumb)?.url;

        return (
          <li key={item.id}>
            <button
              type="button"
              aria-label={ehVideo ? "Abrir vídeo" : "Abrir foto"}
              onClick={() => onAbrir(indice)}
              style={{
                font: "inherit",
                display: "block",
                width: "100%",
                aspectRatio: "1 / 1",
                padding: 0,
                border: "none",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                background: "var(--superficie)",
              }}
            >
              {url ? (
                ehVideo ? (
                  <>
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <IndicadorVideo />
                  </>
                ) : (
                  <img
                    src={url}
                    alt={item.legenda ?? ""}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                )
              ) : (
                <span
                  className="album-esperando"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    background: "var(--linha)",
                  }}
                />
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
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "2px",
      }}
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <li key={i}>
          <span
            className="album-esperando"
            style={{
              display: "block",
              aspectRatio: "1 / 1",
              background: "var(--linha)",
            }}
          />
        </li>
      ))}
    </ul>
  );
}

function IndicadorVideo() {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
        background:
          "linear-gradient(to top, color-mix(in srgb, var(--bg) 35%, transparent), transparent 55%)",
      }}
    >
      <span
        style={{
          width: "2rem",
          height: "2rem",
          borderRadius: "50%",
          border: "1px solid var(--linha)",
          background: "color-mix(in srgb, var(--bg) 72%, transparent)",
          display: "grid",
          placeItems: "center",
          fontSize: "0.75rem",
        }}
      >
        ▶
      </span>
    </span>
  );
}
