"use client";

import { drain, type DrainSummary } from "@albora/core";
import { useCallback, useEffect, useState } from "react";
import { webQueue } from "@/lib/queue";
import { webTransport } from "@/lib/transport";

/**
 * Resumo da fila de um evento — só leitura e dreno, sem enfileirar.
 *
 * Vive no layout para a pílula global; a câmera mantém `useUpload` completo.
 */
export function useEventQueue(eventoId: string) {
  const [pendentes, setPendentes] = useState(0);
  const [bytesPendentes, setBytesPendentes] = useState(0);
  const [online, setOnline] = useState(true);

  const atualizar = useCallback(async () => {
    const fila = await webQueue.list();
    const doEvento = fila.filter((i) => i.eventoId === eventoId);
    setPendentes(doEvento.length);
    setBytesPendentes(
      doEvento.reduce(
        (s, i) => s + (i.corpo.tipo === "blob" ? i.corpo.blob.size : i.corpo.bytes),
        0,
      ),
    );
  }, [eventoId]);

  const drenarAgora = useCallback(async (): Promise<DrainSummary | null> => {
    if (!navigator.onLine) return null;
    const resumo = await drain(webQueue, webTransport, { online: () => navigator.onLine });
    await atualizar();
    return resumo;
  }, [atualizar]);

  useEffect(() => {
    setOnline(navigator.onLine);
    void atualizar();

    const voltou = () => {
      setOnline(true);
      void drenarAgora();
    };
    const caiu = () => setOnline(false);

    window.addEventListener("online", voltou);
    window.addEventListener("offline", caiu);
    const relogio = setInterval(() => void atualizar(), 1500);

    return () => {
      window.removeEventListener("online", voltou);
      window.removeEventListener("offline", caiu);
      clearInterval(relogio);
    };
  }, [atualizar, drenarAgora]);

  return { pendentes, bytesPendentes, online, drenarAgora };
}
