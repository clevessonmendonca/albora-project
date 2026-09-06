"use client";

import { useState } from "react";
import { Badge } from "@albora/ui-web";
import { AdminSection } from "@/features/admin/components/server/admin-shell";
import { ReviewQueue } from "./review-queue";
import { CommentModeration } from "./comment-moderation";

type Props = {
  eventoId: string;
};

export function ModerationPage({ eventoId }: Props) {
  const [fila, setFila] = useState(0);

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="m-0 font-titulo text-lg">Revisão de conteúdo</h2>
          <Badge tone={fila > 0 ? "critico" : "neutral"}>
            {fila === 0 ? "Tudo revisado" : `${fila} ${fila === 1 ? "item" : "itens"} aguardando`}
          </Badge>
        </div>
        <p className="mb-4 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
          Nada sai do ar sozinho. Denúncia, classificador e pedido de quem aparece
          na foto só saem da pausa quando você decide. Você tem o controle final.
        </p>
        <ReviewQueue eventoId={eventoId} onTotalChange={setFila} />
      </AdminSection>

      <AdminSection>
        <h2 className="mb-4 mt-0 font-titulo text-lg">Comentários publicados</h2>
        <CommentModeration eventoId={eventoId} />
      </AdminSection>
    </div>
  );
}
