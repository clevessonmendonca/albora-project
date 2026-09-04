"use client";

import React from "react";
import { Card } from "@albora/ui-web";
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
    <Card elevation={1} className="mb-6">
      <p className="m-0 tipo-body text-ink">
        Você mandou {fotos}
        {curtidas}
      </p>
    </Card>
  );
}
