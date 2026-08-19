"use client";

import React from "react";
import type { RecapPessoal } from "@/features/my-photos/lib/recap-card";

/**
 * Reforço positivo no topo de "Minhas fotos" (spec item 5): "você mandou X
 * fotos, curtida Y vezes". Fecha o loop de participação reusando dados que
 * já existem — nunca um modal de saída, que não é confiável em PWA mobile.
 *
 * Sem fotos ainda, não há nada para celebrar: o card simplesmente some.
 */
export function RecapCard({ recap }: { recap: RecapPessoal | null }) {
  if (!recap || recap.fotos <= 0) return null;

  const fotos = recap.fotos === 1 ? "1 foto" : `${recap.fotos} fotos`;
  const curtidas =
    recap.curtidas > 0
      ? ` · curtida ${recap.curtidas === 1 ? "1 vez" : `${recap.curtidas} vezes`}`
      : "";

  return (
    <div className="mb-6 rounded-token border border-linha bg-superficie px-4 py-3">
      <p className="m-0 text-t-body leading-relaxed text-ink">
        Você mandou {fotos}
        {curtidas}
      </p>
    </div>
  );
}
