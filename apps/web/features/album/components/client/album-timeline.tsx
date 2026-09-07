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
          className="border-t border-linha py-5 first:border-t-0 first:pt-0"
        >
          <p
            className={cn(
              "tipo-label m-0 mb-3 uppercase",
              faixa.amanhecer ? "text-acento" : "text-ink-3",
            )}
          >
            {faixa.hora === null ? "Durante a festa" : hourLabel(faixa.hora)}
          </p>
          <ul className="m-0 grid grid-cols-3 gap-2 p-0 sm:grid-cols-4">
            {faixa.fotos.map((foto) => (
              <li key={foto.id}>
                <Tile
                  foto={foto}
                  amanhecer={faixa.amanhecer}
                  hora={faixa.hora}
                  onAbrir={() => onAbrir(foto)}
                />
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
        <li key={faixa} className="border-t border-linha py-5 first:border-t-0 first:pt-0">
          <span className="album-esperando mb-3 block h-3 w-16 rounded-pilula bg-superficie-alta" />
          <span className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className="album-esperando aspect-square rounded-media bg-superficie-alta"
              />
            ))}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Tile({
  foto,
  amanhecer,
  hora,
  onAbrir,
}: {
  foto: ServedPhoto;
  amanhecer: boolean;
  hora: number | null;
  onAbrir: () => void;
}) {
  const src = foto.urlThumb || foto.url;
  const rotulo =
    hora === null ? "Abrir foto" : `Abrir foto das ${hourLabel(hora)}`;

  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={onAbrir}
      className={cn(
        "relative block aspect-square w-full cursor-pointer overflow-hidden rounded-media border-0 bg-superficie-alta p-0 transition-transform duration-instantaneo ease-mola active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100",
        amanhecer && "shadow-[inset_0_0_0_1.5px_var(--acento)]",
      )}
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="block size-full object-cover object-top"
        />
      ) : (
        <span className="album-esperando block size-full bg-superficie-alta" />
      )}
    </button>
  );
}
