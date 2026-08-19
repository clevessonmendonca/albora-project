"use client";

import React from "react";
import { cn } from "@albora/ui-web";
import { useContadorAoVivo } from "../../lib/use-animated-counter";
import { rotuloDosContadores } from "../../lib/participation";
import type { ContadoresDaParede } from "../../lib/types";

/**
 * O contador público (spec A4): prova social ao vivo do evento corrente, só
 * do que já passou pelo gate de moderação — a mesma dupla fotos/convidados
 * que `album.contadores` mostra ao convidado. Overlay puro sobre o
 * `WallStage`: não participa do enquadramento, então nenhum modelo perde
 * área de foto por causa dele.
 *
 * `contadores` vem `null` enquanto `/api/wall` não incluir o campo — o
 * componente some, nunca estima o total a partir da janela de rotação da
 * parede (capada, não é a noite inteira).
 */
export function WallParticipationCounter({
  contadores,
}: {
  contadores: ContadoresDaParede | null;
}) {
  const fotos = useContadorAoVivo(contadores?.fotos ?? 0);
  const convidados = useContadorAoVivo(contadores?.convidados ?? 0);

  if (!contadores || contadores.fotos <= 0) return null;

  return (
    <div
      role="status"
      aria-label={rotuloDosContadores(contadores)}
      className={cn(
        "absolute left-[clamp(0.75rem,2vw,1.5rem)] top-[clamp(0.75rem,2vw,1.5rem)]",
        "flex items-center gap-[clamp(0.4rem,1vw,0.65rem)]",
        "rounded-pilula border border-linha bg-bg-vidro backdrop-blur-[6px]",
        "px-[clamp(0.85rem,1.6vw,1.35rem)] py-[clamp(0.45rem,1vw,0.7rem)]",
        "text-[clamp(0.8rem,1.3vw,1.05rem)] text-ink",
      )}
    >
      <span className="tabular-nums">{fotos}</span>
      <span className="text-ink-2">{fotos === 1 ? "foto" : "fotos"}</span>
      <span aria-hidden className="text-ink-3">
        ·
      </span>
      <span className="tabular-nums">{convidados}</span>
      <span className="text-ink-2">{convidados === 1 ? "pessoa" : "pessoas"}</span>
    </div>
  );
}
