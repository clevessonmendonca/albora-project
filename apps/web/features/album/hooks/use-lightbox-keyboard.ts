"use client";

import { useEffect } from "react";

type LightboxKeyboardHandlers = {
  onEscape: () => void;
  onArrowLeft: () => void;
  onArrowRight: () => void;
  disabled?: boolean;
};

export function useLightboxKeyboard({
  onEscape,
  onArrowLeft,
  onArrowRight,
  disabled = false,
}: LightboxKeyboardHandlers) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onEscape();
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;

      // Seta dentro do controle nativo do vídeo é para percorrer o vídeo. Sem
      // esta guarda, quem tenta avançar dez segundos troca de mídia.
      const alvo = ev.target as HTMLElement | null;
      if (alvo?.closest("video, audio, input, textarea, select, [contenteditable]")) return;

      if (ev.key === "ArrowLeft") onArrowLeft();
      else onArrowRight();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEscape, onArrowLeft, onArrowRight, disabled]);
}
