"use client";

import React from "react";

export function ProfileStats({
  totalFotos,
  totalCurtidas,
}: {
  totalFotos: number;
  totalCurtidas: number;
}) {
  return (
    <dl className="m-0 flex gap-6">
      <div>
        <dt className="text-[0.6875rem] uppercase tracking-rotulo text-ink-3">Fotos</dt>
        <dd className="m-0 font-titulo text-[1.125rem] tracking-titulo text-ink">{totalFotos}</dd>
      </div>
      <div>
        <dt className="text-[0.6875rem] uppercase tracking-rotulo text-ink-3">Curtidas</dt>
        <dd className="m-0 font-titulo text-[1.125rem] tracking-titulo text-ink">{totalCurtidas}</dd>
      </div>
    </dl>
  );
}
