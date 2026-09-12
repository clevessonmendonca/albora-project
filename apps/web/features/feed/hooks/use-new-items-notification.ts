"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook para detectar novos itens no topo da lista.
 *
 * @returns Estado e handlers para gerenciar notificação de novos itens
 */
export function useNewItemsNotification(firstItemId: string | null) {
  const prevFirstId = useRef<string | null>(null);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    const prev = prevFirstId.current;
    prevFirstId.current = firstItemId;

    if (prev !== null && firstItemId !== null && firstItemId !== prev) {
      setHasNew(true);
    }
  }, [firstItemId]);

  useEffect(() => {
    if (!hasNew) return;

    const handleScroll = () => {
      if (window.scrollY < 120) setHasNew(false);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasNew]);

  const dismiss = useCallback(() => {
    setHasNew(false);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    dismiss();
  }, [dismiss]);

  return { hasNew, dismiss, scrollToTop };
}