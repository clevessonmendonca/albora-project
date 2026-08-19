"use client";

import type { ModoInteracao } from "@albora/core";
import Link from "next/link";
import { PhotoCard } from "@albora/ui-web";
import { CommentSheet } from "@/features/feed/components/client/comment-sheet";
import { useComments } from "@/features/feed/hooks/use-comments";
import { useReaction, type ResultadoReacao } from "@/features/feed/hooks/use-reaction";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";
import { formatQuando } from "../../lib/format-quando";

/**
 * Uma foto do feed da Home, no `PhotoCard` do kit novo.
 *
 * Curtida e comentário são reais — `/api/reaction` e `/api/comments` já
 * existem e já valem para `/feed` (spec 008/014, ADR 0009, atualizado).
 * Curtida nunca espera o gate: `item.reacoes`/`item.minhaReacao` chegam em
 * qualquer modo (ver `ItemVisivel`), e o botão de curtir fica ativo desde a
 * primeira foto. Comentário continua atrás de `interacao === "completo"` —
 * é ele que espera o horário que os noivos escolherem, igual a
 * `PhotoInteraction`.
 */
export function HomeFeedCard({
  item,
  url,
  interacao,
  base,
  onReacoes,
}: {
  item: ItemVisivel;
  url: string | null;
  interacao: ModoInteracao;
  /** Raiz do evento (`/e/{slug}`) — monta o link do perfil do autor. */
  base: string;
  onReacoes: (uploadId: string, resultado: ResultadoReacao) => void;
}) {
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
      />

      {completo && <CommentSheet comentarios={comentarios} />}
    </>
  );
}
