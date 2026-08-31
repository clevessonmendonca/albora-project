"use client";

import React from "react";
import type { RecapPessoal } from "@/features/my-photos/lib/recap-card";

/** Sem fotos = some. Nunca modal de saída — não é confiável em PWA mobile. */
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
