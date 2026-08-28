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
      if (ev.key === "ArrowLeft") onArrowLeft();
      if (ev.key === "ArrowRight") onArrowRight();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEscape, onArrowLeft, onArrowRight, disabled]);
}
