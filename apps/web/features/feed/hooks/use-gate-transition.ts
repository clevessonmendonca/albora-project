"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook para detectar quando o gate de interação abre.
 *
 * @param currentMode - Modo atual de interação
 * @returns Estado do gate e handler para fechar
 */
export function useGateTransition(currentMode: string) {
  const [gateOpened, setGateOpened] = useState(false);
  const previousMode = useRef<string | null>(null);

  useEffect(() => {
    if (previousMode.current === "espelho" && currentMode === "completo") {
      setGateOpened(true);
    }
    previousMode.current = currentMode;
  }, [currentMode]);

  useEffect(() => {
    if (!gateOpened) return;
    const timeout = setTimeout(() => setGateOpened(false), 6000);
    return () => clearTimeout(timeout);
  }, [gateOpened]);

  const close = useCallback(() => setGateOpened(false), []);

  return { gateOpened, close };
}
