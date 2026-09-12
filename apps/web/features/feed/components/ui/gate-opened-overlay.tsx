"use client";

import { useEffect } from "react";

type GateOpenedOverlayProps = {
  onClose: () => void;
  cameraPath: string;
};

export function GateOpenedOverlay({ onClose, cameraPath }: GateOpenedOverlayProps) {
  useEffect(() => {
    function handleKeyDown(ev: KeyboardEvent) {
      if (ev.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Feed liberado"
      className="fixed inset-0 z-40 grid place-items-center bg-bg-overlay p-6"
      style={{ animation: "feed-amanhecer 0.35s var(--curva) both" }}
      onClick={onClose}
    >
      <div
        className="grid w-full max-w-xs gap-5 rounded-superficie border border-linha bg-superficie p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="m-0 text-[2rem] leading-none" aria-hidden>
          🎉
        </p>
        <div>
          <p className="m-0 font-titulo text-[1.2rem] font-normal">A festa está liberada</p>
          <p className="m-0 mt-1.5 text-[0.9rem] leading-relaxed text-ink-2">
            Comentários, reações e o feed completo abriram. Veja o que todo mundo fotografou.
          </p>
        </div>
        <div className="grid gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 cursor-pointer rounded-pilula border-none bg-acento px-6 font-inherit text-[0.9rem] font-medium text-sobre-acento transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80"
          >
            Ver as fotos
          </button>
          <a
            href={cameraPath}
            className="grid min-h-12 place-items-center rounded-pilula border border-linha bg-transparent px-6 text-[0.9rem] text-ink no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
          >
            Tirar foto
          </a>
        </div>
      </div>
    </div>
  );
}
