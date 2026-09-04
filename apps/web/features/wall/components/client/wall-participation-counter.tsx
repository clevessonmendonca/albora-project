"use client";

import React from "react";
import { cn } from "@albora/ui-web";
import { useContadorAoVivo } from "../../lib/use-animated-counter";
import { rotuloDosContadores } from "../../lib/participation";
import type { ContadoresDaParede } from "../../lib/types";

/** Some quando `contadores` é `null` — nunca estima o total da janela de rotação, que não é a noite inteira. */
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
        "parede-subir absolute left-[clamp(0.75rem,2vw,1.5rem)] top-[clamp(0.75rem,2vw,1.5rem)]",
        "flex items-center gap-[clamp(0.4rem,1vw,0.65rem)]",
        "tipo-body rounded-pilula border border-linha bg-bg-vidro shadow-suave",
        "px-[clamp(0.85rem,1.6vw,1.35rem)] py-[clamp(0.45rem,1vw,0.7rem)]",
        "text-[clamp(0.8rem,1.3vw,1.05rem)] text-ink",
      )}
    >
      <span className="font-titulo tabular-nums">{fotos}</span>
      <span className="text-ink-2">{fotos === 1 ? "foto" : "fotos"}</span>
      <span aria-hidden className="text-ink-3">
        ·
      </span>
      <span className="font-titulo tabular-nums">{convidados}</span>
      <span className="text-ink-2">{convidados === 1 ? "pessoa" : "pessoas"}</span>
    </div>
  );
}
