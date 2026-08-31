"use client";

import type { ModoInteracao } from "@albora/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PhotoCard } from "@albora/ui-web";
import { CommentSheet } from "@/features/feed/components/client/comment-sheet";
import { useComments } from "@/features/feed/hooks/use-comments";
import { useReaction, type ResultadoReacao } from "@/features/feed/hooks/use-reaction";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";
import { formatQuando } from "../../lib/format-quando";

/** Curtida ativa desde a primeira foto (sem gate); comentário espera `interacao === "completo"` como `PhotoInteraction`. */
export function HomeFeedCard({
  item,
  url,
  interacao,
  base,
  onReacoes,
  onAbrir,
}: {
  item: ItemVisivel;
  url: string | null;
  interacao: ModoInteracao;
  /** Raiz do evento (`/e/{slug}`) — monta o link do perfil do autor. */
  base: string;
  onReacoes: (uploadId: string, resultado: ResultadoReacao) => void;
  /** Toque na foto abre o Viewer compartilhado no lugar; ausente = card sem lightbox. */
  onAbrir?: () => void;
}) {
  const router = useRouter();
  const completo = interacao === "completo";

  const reacao = useReaction(item.id, item.reacoes, item.minhaReacao);
  const comentarios = useComments(item.id, completo);

  async function alternarCurtida() {
    const resultado = await reacao.alternar();
    if (resultado) onReacoes(item.id, resultado);
  }

  return (
    <>
      <PhotoCard
        autor={item.autor}
        {...(item.sessaoAutor
          ? {
              autorHref: `${base}/g/${encodeURIComponent(item.sessaoAutor)}`,
              linkComponent: Link,
            }
          : {})}
        quando={formatQuando(item.criadaEm)}
        {...(url ? { fotoUrl: url } : {})}
        curtidas={reacao.reacoes}
        curtido={reacao.minha !== null}
        comentarios={completo ? comentarios.total : 0}
        onCurtir={() => void alternarCurtida()}
        {...(completo ? { onComentar: comentarios.abrir } : {})}
        {...(onAbrir ? { onAbrir } : {})}
      />

      {completo && (
        <CommentSheet
          comentarios={comentarios}
          onVerAutor={(id) => router.push(`${base}/g/${encodeURIComponent(id)}`)}
        />
      )}
    </>
  );
}
