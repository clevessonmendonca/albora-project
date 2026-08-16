"use client";

import { useState } from "react";
import { AdminSection } from "@/features/admin/components/server/admin-shell";
import { ReviewQueue } from "./review-queue";
import { CommentModeration } from "./comment-moderation";

type Props = {
  eventoId: string;
};

export function ModerationPage({ eventoId }: Props) {
  const [fila, setFila] = useState(0);

  const badgeClass =
    fila > 0
      ? "bg-critico text-sobre-acento"
      : "bg-superficie-alta text-ink";

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="m-0 font-titulo text-lg">Fila de revisão</h2>
          <span
            className={`rounded-pilula px-3 py-[0.35rem] font-titulo text-[0.8125rem] ${badgeClass}`}
          >
            {fila} na fila
          </span>
        </div>
        <p className="mb-4 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
          Nada sai do ar sozinho. A denúncia ofensiva segura o telão; o pedido
          de quem aparece na foto só entra aqui. Você decide manter ou ocultar.
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
