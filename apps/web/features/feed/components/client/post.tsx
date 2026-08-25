"use client";

import type { ComponentType, ReactNode } from "react";
import type { ModoInteracao } from "@albora/core";
import { PhotoInteraction } from "@/features/feed/components/client/photo-interaction";
import { PostHeader } from "@albora/ui-web";
import type { ResultadoReacao } from "@/features/feed/hooks/use-reaction";
import { cssAspectRatio } from "@/lib/media-aspect";

/**
 * Uma publicação no feed — layout de `FeedScreen` em `/telas`.
 *
 * Cabeçalho com iniciais, foto no aspecto persistido (4:5 se o confirm
 * não gravou o par), estrela + comentário embaixo.
 */

export function Post({
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
  isVideo,
  largura,
  altura,
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
  isVideo?: boolean;
  largura?: number;
  altura?: number;
}) {
  const meta = lugar ? `· ${lugar}` : null;
  const aspecto = cssAspectRatio(largura, altura);

  return (
    <article className="border-t border-linha">
      <div className="py-4">
        <PostHeader
          author={autor}
          meta={meta}
          {...(autorHref ? { autorHref, linkComponent } : {})}
        />
      </div>

      <div className="relative mb-3.5 aspect-4/5" style={aspecto ? { aspectRatio: aspecto } : undefined}>
        {url ? (
          isVideo ? (
            <video
              className="feed-amanhece block size-full bg-bg object-contain"
              src={url}
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              className="feed-amanhece block size-full bg-bg object-contain"
              src={url}
              alt={legenda ?? ""}
              loading="lazy"
              decoding="async"
            />
          )
        ) : (
          <div className="feed-esperando absolute inset-[8%] rounded-token border border-linha" />
        )}
      </div>

      <div className="pb-3">
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
        <p className="mb-4.5 text-[0.875rem] leading-[1.5] text-ink-2">
          <span className="font-titulo text-ink">{autor}</span> {legenda}
        </p>
      )}
    </article>
  );
}

export function PostLoading() {
  return (
    <article aria-hidden className="border-t border-linha pb-4">
      <div className="flex gap-2.5 py-3.5">
        <span className="feed-esperando size-7.5 rounded-full bg-superficie-alta" />
        <span className="feed-esperando h-3.5 w-24 self-center rounded-pilula bg-superficie-alta" />
      </div>
      <div className="feed-esperando aspect-4/5 rounded-token border border-linha" />
    </article>
  );
}
