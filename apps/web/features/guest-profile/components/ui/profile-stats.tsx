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
    <dl className="m-0 flex gap-7">
      <div>
        <dt className="tipo-label m-0 text-ink-3">Fotos</dt>
        <dd className="m-0 tipo-subtitle text-ink">{totalFotos}</dd>
      </div>
      <div>
        <dt className="tipo-label m-0 text-ink-3">Curtidas</dt>
        <dd className="m-0 tipo-subtitle text-ink">{totalCurtidas}</dd>
      </div>
    </dl>
  );
}
