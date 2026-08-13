"use client";

import type { UrlDeMidia } from "@/lib/midia";
import type { ItemVisivel } from "@/lib/usar-feed";

/**
 * Parede espelhada antes do gate — layout de `TelaAntesDoGate` em `/telas`.
 *
 * Grade 2×N, sem reação, sem comentário, sem stories: a interação ainda não
 * abriu, e desenhar botões trancados mentiria (ADR 0009).
 */

export function MirrorGrid({
  itens,
  urls,
}: {
  itens: readonly ItemVisivel[];
  urls: Map<string, UrlDeMidia>;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.375rem",
      }}
    >
      {itens.map((item) => {
        const ehVideo = item.mime.startsWith("video/");
        const url = urls.get(item.chaveThumb)?.url;

        return (
          <div
            key={item.id}
            style={{
              position: "relative",
              aspectRatio: "1 / 1",
              borderRadius: "var(--raio)",
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
              <div
                className="feed-esperando"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "1px solid var(--linha)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MirrorGridLoading() {
  return (
    <div
      aria-hidden
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.375rem",
      }}
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="feed-esperando"
          style={{
            aspectRatio: "1 / 1",
            borderRadius: "var(--raio)",
            border: "1px solid var(--linha)",
          }}
        />
      ))}
    </div>
  );
}
