"use client";

import type { ItemDaGaleria } from "@albora/core";
import { cn } from "@albora/ui-web";
import { MiniaturaMinhas } from "../ui/miniatura-minhas";

type GalleryItemProps = {
  item: ItemDaGaleria;
  url?: string | undefined;
  urlVideo?: string | null | undefined;
  isVideo: boolean;
  rotulo: string;
  removendoId: string | null;
  onRemover: (item: ItemDaGaleria) => Promise<boolean>;
  onAbrir: (id: string) => void;
};

/**
 * Item da grade de galeria pessoal.
 * Mostra miniatura + botão remover + estado.
 */
export function GalleryItem({
  item,
  url,
  urlVideo,
  isVideo,
  rotulo,
  removendoId,
  onRemover,
  onAbrir,
}: GalleryItemProps) {
  return (
    <li className="relative aspect-square">
      {/* Botão remover (apenas pendentes) — 44px de alvo de toque, mesma mola do resto do produto */}
      {item.estado !== "enviada" && (
        <button
          type="button"
          aria-label="Remover esta foto"
          disabled={removendoId === item.id}
          onClick={() => void onRemover(item)}
          className="absolute right-1 top-1 z-[1] grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-full border-0 bg-bg-vidro-forte p-0 text-[0.9375rem] text-ink transition-[opacity,transform] duration-instantaneo ease-mola hover:opacity-80 active:scale-[0.94] disabled:cursor-wait motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          ×
        </button>
      )}

      {/* Miniatura — mesmo padrão de moldura do álbum: rounded-media + bg-superficie-alta, sem corte no rosto */}
      {item.estado === "enviada" ? (
        <button
          type="button"
          aria-label={isVideo ? "Abrir este vídeo" : "Abrir esta foto"}
          onClick={() => onAbrir(item.id)}
          className="block size-full cursor-pointer overflow-hidden rounded-media border-0 bg-transparent p-0 transition-transform duration-instantaneo ease-mola active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <div className="relative size-full bg-superficie-alta">
            <MiniaturaMinhas
              isVideo={isVideo}
              url={url}
              urlVideo={urlVideo}
              pendente={false}
            />
          </div>
        </button>
      ) : (
        <div className="relative size-full overflow-hidden rounded-media bg-superficie-alta">
          <MiniaturaMinhas
            isVideo={isVideo}
            url={url}
            urlVideo={urlVideo}
            pendente
          />
        </div>
      )}

      {/* Label de estado */}
      {rotulo && (
        <span
          className={cn(
            "pointer-events-none absolute inset-x-1 bottom-1 rounded-pilula bg-bg-vidro-suave px-[0.35rem] py-[0.2rem] text-center text-[0.625rem] uppercase tracking-[0.06em]",
            item.estado === "falhou" ? "text-critico" : "text-ink-2",
          )}
        >
          {rotulo}
        </span>
      )}
    </li>
  );
}
