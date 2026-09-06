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
      className="feed-amanhece fixed inset-0 z-40 grid place-items-center bg-bg-overlay p-6"
      onClick={onClose}
    >
      <style>{`
        @keyframes gate-momento-entra {
          from { opacity: 0; transform: scale(0.92) translateY(0.5rem); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .gate-momento { animation: gate-momento-entra var(--tempo) var(--mola) both; }
        @media (prefers-reduced-motion: reduce) {
          .gate-momento { animation: none !important; }
        }
      `}</style>
      <div
        className="gate-momento elev-3 grid w-full max-w-xs gap-5 rounded-superficie p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="m-0 text-[2rem] leading-none" aria-hidden>
          🎉
        </p>
        <div>
          <p className="tipo-subtitle m-0 text-ink">A festa está liberada</p>
          <p className="tipo-caption m-0 mt-1.5 leading-relaxed text-ink-2">
            Comentários, reações e o feed completo abriram. Veja o que todo mundo fotografou.
          </p>
        </div>
        <div className="grid gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 cursor-pointer rounded-pilula border-none bg-acento px-6 font-inherit text-[0.9rem] font-medium text-sobre-acento shadow-suave transition-transform duration-instantaneo ease-mola hover:opacity-90 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Ver as fotos
          </button>
          <a
            href={cameraPath}
            className="grid min-h-12 place-items-center rounded-pilula border border-linha bg-transparent px-6 text-[0.9rem] text-ink no-underline transition-transform duration-instantaneo ease-mola hover:border-acento-texto active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Tirar foto
          </a>
        </div>
      </div>
    </div>
  );
}
