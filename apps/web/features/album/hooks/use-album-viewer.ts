"use client";

import { useCallback, useEffect, useState } from "react";
import type { ServedPhoto } from "@/lib/album";

export function useAlbumViewer(fotos: ServedPhoto[]) {
  const [aberta, setAberta] = useState<ServedPhoto | null>(null);

  useEffect(() => {
    if (aberta && !fotos.some((f) => f.id === aberta.id)) {
      setAberta(null);
    }
  }, [aberta, fotos]);

  useEffect(() => {
    if (!aberta) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [aberta]);

  const abrir = useCallback((foto: ServedPhoto) => {
    setAberta(foto);
  }, []);

  const fechar = useCallback(() => {
    setAberta(null);
  }, []);

  const navegarPara = useCallback(
    (delta: number) => {
      if (!aberta) return;
      const i = fotos.findIndex((f) => f.id === aberta.id);
      const proxima = fotos[i + delta];
      if (proxima) setAberta(proxima);
    },
    [aberta, fotos],
  );

  const anterior = useCallback(() => {
    navegarPara(-1);
  }, [navegarPara]);

  const proxima = useCallback(() => {
    navegarPara(1);
  }, [navegarPara]);

  return {
    aberta,
    abrir,
    fechar,
    anterior,
    proxima,
  };
}
