"use client";

import { useEffect, useState } from "react";

export function useStatsPolling(slug: string, initialPhotos: number) {
  const [photos, setPhotos] = useState(initialPhotos);

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch(`/api/e/${encodeURIComponent(slug)}/stats`);
        if (r.ok) {
          const d = (await r.json()) as { fotos: number };
          setPhotos(d.fotos);
        }
      } catch {
        // degradar silenciosamente
      }
    };

    const id = setInterval(() => void poll(), 60_000);
    return () => clearInterval(id);
  }, [slug]);

  return photos;
}
