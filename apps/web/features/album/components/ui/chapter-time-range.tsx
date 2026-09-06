"use client";

import type { AlbumBand } from "../../lib/bands";

export function ChapterTimeRange({ faixas }: { faixas: AlbumBand[] }) {
  const horas = faixas.map((f) => f.hora).filter((h): h is number => h !== null);
  if (horas.length === 0) return null;

  const primeira = Math.min(...horas);
  const ultima = Math.max(...horas);
  const label = primeira === ultima ? `${primeira}h` : `${primeira}h – ${ultima}h`;

  return <p className="tipo-caption m-0 mt-1 text-ink-3">{label}</p>;
}
