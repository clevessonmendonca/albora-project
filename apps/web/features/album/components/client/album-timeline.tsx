"use client";

import { cn } from "@albora/ui-web";
import { hourLabel } from "@/features/feed/lib/group-by-hour";
import type { ServedPhoto } from "@/lib/album";
import type { AlbumBand } from "../../lib/bands";

export function AlbumTimeline({
  faixas,
  onAbrir,
}: {
  faixas: readonly AlbumBand[];
  onAbrir: (foto: ServedPhoto) => void;
}) {
  return (
    <ol className="m-0 list-none p-0">
      {faixas.map((faixa) => (
        <li
          key={faixa.chave}
          className={cn(
            "grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3.5 border-t border-linha py-4 first:border-t-0 first:pt-0",
          )}
        >
          <p
            className={cn(
              "m-0 pt-3 font-titulo text-[0.625rem] uppercase tracking-rotulo",
              faixa.amanhecer ? "text-acento" : "text-ink-3",
            )}
          >
            {faixa.hora === null ? "Durante a festa" : hourLabel(faixa.hora)}
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {faixa.fotos.map((foto) => (
              <li key={foto.id}>
                <Disc foto={foto} amanhecer={faixa.amanhecer} onAbrir={() => onAbrir(foto)} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

export function AlbumTimelineLoading() {
  return (
    <ol aria-hidden className="m-0 list-none p-0">
      {[0, 1, 2].map((faixa) => (
        <li
          key={faixa}
          className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3.5 border-t border-linha py-4 first:border-t-0 first:pt-0"
        >
          <span className="album-esperando mt-3 block h-3 w-10 rounded-pilula bg-linha" />
          <span className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4].map((n) => (
              <span key={n} className="album-esperando block size-11 rounded-full bg-linha" />
            ))}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Disc({
  foto,
  amanhecer,
  onAbrir,
}: {
  foto: ServedPhoto;
  amanhecer: boolean;
  onAbrir: () => void;
}) {
  const src = foto.urlThumb || foto.url;

  return (
    <button
      type="button"
      aria-label="Abrir foto"
      onClick={onAbrir}
      className={cn(
        "relative block size-11 cursor-pointer overflow-hidden rounded-full border-0 bg-superficie p-0",
        amanhecer && "shadow-[inset_0_0_0_1px_var(--acento)]",
      )}
    >
      {src ? (
        <>
          <img
            src={src}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full scale-[1.2] object-cover blur-sm saturate-[0.7] brightness-[0.5]"
          />
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-contain"
          />
        </>
      ) : (
        <span className="album-esperando block size-full bg-linha" />
      )}
    </button>
  );
}
