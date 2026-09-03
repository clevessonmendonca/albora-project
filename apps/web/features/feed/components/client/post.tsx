"use client";

import React, { memo, type ComponentType, type ReactNode } from "react";
import Image from "next/image";
import type { ModoInteracao } from "@albora/core";
import { PhotoInteraction } from "@/features/feed/components/client/photo-interaction";
import { PostHeader } from "@albora/ui-web";
import type { ResultadoReacao } from "@/features/feed/hooks/use-reaction";
import { cssAspectRatio } from "@/lib/media-aspect";
import { tempoRelativo } from "@/lib/tempo-relativo";

export const Post = memo(function Post({
  uploadId,
  interacao,
  reacoes,
  minhaReacao,
  sessaoAutor,
  minha,
  onReacoes,
  onBloqueado,
  onCompartilhar,
  compartilhando,
  url,
  autor,
  autorHref,
  linkComponent,
  onVerAutor,
  legenda,
  lugar,
  criadaEm,
  isVideo,
  largura,
  altura,
  onAbrir,
}: {
  uploadId: string;
  interacao: ModoInteracao;
  reacoes?: number;
  minhaReacao?: string | null;
  sessaoAutor?: string;
  minha?: boolean;
  onReacoes?: (resultado: ResultadoReacao) => void;
  onBloqueado?: () => void;
  onCompartilhar?: () => void;
  compartilhando?: boolean;
  url: string | null;
  autor: string;
  autorHref?: string;
  linkComponent?: ComponentType<{ href: string; className?: string; children?: ReactNode }> | "a";
  onVerAutor?: ((sessaoId: string) => void) | undefined;
  legenda: string | null;
  lugar?: string | null;
  criadaEm?: string;
  isVideo?: boolean;
  largura?: number;
  altura?: number;
  onAbrir?: () => void;
}) {
  const timestamp = criadaEm ? tempoRelativo(criadaEm) : null;
  const aspecto = cssAspectRatio(largura, altura);
  const rotuloAbrir = isVideo ? `Abrir vídeo de ${autor}` : `Abrir foto de ${autor}`;

  return (
    <article data-testid={`post-${uploadId}`} className="border-t border-linha">
      <div className="py-3 mb-0.5 sm:py-4 sm:mb-1">
        <PostHeader
          author={autor}
          meta={lugar ?? null}
          timestamp={timestamp}
          {...(autorHref ? { autorHref, linkComponent } : {})}
        />
      </div>

      <div className="relative mb-2.5 sm:mb-3 aspect-4/5" style={aspecto ? { aspectRatio: aspecto } : undefined}>
        {url ? (
          onAbrir ? (
            <button
              type="button"
              onClick={onAbrir}
              aria-label={rotuloAbrir}
              className="block size-full cursor-pointer border-0 bg-transparent p-0"
            >
              {isVideo ? (
                <video
                  className="feed-amanhece pointer-events-none block size-full bg-bg object-contain"
                  src={url}
                  playsInline
                  preload="metadata"
                  muted
                />
              ) : (
                <Image
                  className="feed-amanhece bg-bg object-contain"
                  src={url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              )}
            </button>
          ) : isVideo ? (
            <video
              className="feed-amanhece block size-full bg-bg object-contain"
              src={url}
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <Image
              className="feed-amanhece bg-bg object-contain"
              src={url}
              alt={legenda || `Foto de ${autor}`}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          )
        ) : (
          <div className="feed-esperando absolute inset-[8%] rounded-token border border-linha" />
        )}
      </div>

      <div className="pb-2 sm:pb-2.5">
        <PhotoInteraction
          uploadId={uploadId}
          interacao={interacao}
          autor={autor}
          {...(reacoes !== undefined ? { reacoesInicial: reacoes } : {})}
          {...(minhaReacao !== undefined ? { minhaInicial: minhaReacao } : {})}
          {...(sessaoAutor ? { sessaoAutor } : {})}
          {...(minha !== undefined ? { minha } : {})}
          {...(onReacoes ? { onReacoes } : {})}
          {...(onBloqueado ? { onBloqueado } : {})}
          {...(onCompartilhar ? { onCompartilhar } : {})}
          {...(compartilhando !== undefined ? { compartilhando } : {})}
          {...(onVerAutor ? { onVerAutor } : {})}
        />
      </div>

      {legenda && (
        <p className="mb-3 sm:mb-3.5 text-[0.875rem] leading-[1.68] text-ink">
          {legenda}
        </p>
      )}
    </article>
  );
});

export function PostLoading() {
  return (
    <article aria-hidden className="border-t border-linha pb-4">
      <div className="flex gap-2.5 py-3">
        <span className="feed-esperando size-7.5 rounded-full bg-superficie-alta" />
        <span className="feed-esperando h-3.5 w-24 self-center rounded-pilula bg-superficie-alta" />
      </div>
      <div className="feed-esperando aspect-4/5 rounded-token border border-linha" />
    </article>
  );
}
