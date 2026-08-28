"use client";

import type { ItemDaGaleria } from "@albora/core";
import { MiniaturaMinhas } from "../ui/miniatura-minhas";

type GalleryItemProps = {
  item: ItemDaGaleria;
  url?: string;
  urlVideo?: string | null;
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
      {/* Botão remover (apenas pendentes) */}
      {item.estado !== "enviada" && (
        <button
          type="button"
          aria-label="Remover esta foto"
          disabled={removendoId === item.id}
          onClick={() => void onRemover(item)}
          className="absolute right-1 top-1 z-[1] grid min-h-7 min-w-7 cursor-pointer place-items-center rounded-full border-0 bg-bg-vidro-opaco p-0 text-xs text-ink-2 transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-80 disabled:cursor-wait"
        >
          ×
        </button>
      )}

      {/* Miniatura */}
      {item.estado === "enviada" ? (
        <button
          type="button"
          aria-label={isVideo ? "Abrir este vídeo" : "Abrir esta foto"}
          onClick={() => onAbrir(item.id)}
          className="size-full cursor-pointer overflow-hidden rounded-token border-0 bg-transparent p-0 transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90"
        >
          <div className="relative size-full border border-linha bg-superficie">
            <MiniaturaMinhas
              isVideo={isVideo}
              url={url}
              urlVideo={urlVideo}
              pendente={false}
            />
          </div>
        </button>
      ) : (
        <div className="relative size-full overflow-hidden rounded-token border border-linha bg-superficie">
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
          className={`absolute inset-x-1 bottom-1 rounded-pilula bg-bg-vidro-suave px-[0.35rem] py-[0.2rem] text-center text-[0.625rem] uppercase tracking-[0.06em] ${
            item.estado === "falhou" ? "text-critico" : "text-ink-2"
          }`}
        >
          {rotulo}
        </span>
      )}
    </li>
  );
}
