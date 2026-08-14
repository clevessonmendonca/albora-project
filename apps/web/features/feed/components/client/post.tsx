"use client";

import type { ModoInteracao } from "@albora/core";
import { PhotoInteraction } from "@/features/feed/components/client/photo-interaction";
import { PostHeader } from "@albora/ui-web";
import type { ResultadoReacao } from "@/features/feed/hooks/use-reaction";

/**
 * Uma publicação no feed — layout de `FeedScreen` em `/telas`.
 *
 * Cabeçalho com iniciais, foto em 4:5 sem cortar, estrela + comentário embaixo.
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
  url,
  autor,
  legenda,
  lugar,
  ehVideo,
}: {
  uploadId: string;
  interacao: ModoInteracao;
  reacoes?: number;
  minhaReacao?: string | null;
  sessaoAutor?: string;
  minha?: boolean;
  onReacoes?: (resultado: ResultadoReacao) => void;
  onBloqueado?: () => void;
  url: string | null;
  autor: string;
  legenda: string | null;
  lugar?: string | null;
  ehVideo?: boolean;
}) {
  const meta = lugar ? `· ${lugar}` : null;

  return (
    <article className="border-t border-linha">
      <div className="py-3.5">
        <PostHeader author={autor} meta={meta} />
      </div>

      <div className="relative mb-3 aspect-4/5">
        {url ? (
          ehVideo ? (
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

      <div className="pb-2.5">
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
        />
      </div>

      {legenda && (
        <p className="mb-4 text-[0.84375rem] leading-[1.45] text-ink-2">
          <span className="text-ink">{autor}</span> {legenda}
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
