"use client";

import { type DrainSummary } from "@albora/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { drainAndReport } from "@/features/guest/lib/funnel-from-drain";
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
  const drainingRef = useRef(false);

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
    if (drainingRef.current) return null;

    drainingRef.current = true;
    try {
      const resumo = await drainAndReport(webQueue, webTransport, {
        online: () => navigator.onLine,
      });
      await atualizar();
      return resumo;
    } finally {
      drainingRef.current = false;
    }
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

    // Convidado volta à aba/PWA após sair (bfcache, troca de app, notificação).
    const aoVoltar = () => {
      if (document.visibilityState === "visible") {
        if (navigator.onLine) void drenarAgora();
        else void atualizar();
      }
    };
    const aoVisibilityChange = () => aoVoltar();
    const aoPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) aoVoltar();
    };

    document.addEventListener("visibilitychange", aoVisibilityChange);
    window.addEventListener("pageshow", aoPageShow);

    return () => {
      window.removeEventListener("online", voltou);
      window.removeEventListener("offline", caiu);
      clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoVisibilityChange);
      window.removeEventListener("pageshow", aoPageShow);
    };
  }, [atualizar, drenarAgora]);

  return { pendentes, bytesPendentes, online, drenarAgora };
}
