"use client";

import React, { useEffect, useRef } from "react";
import type { AudioRecado } from "@/features/guest/hooks/use-guestbook";
import { VoiceNotePlayer } from "@/features/guest/components/client/voice-note-player";

/** Recado dos anfitriões em tela cheia (redesign §3.2) — o recado é conteúdo, não login: abre do
 *  primeiro story do trilho. Texto é o corpo (música alta no salão); o áudio emociona quem tem
 *  fone. Fecha no X, no Esc ou tocando fora. */
export function RecadoStory({
  rotulo,
  texto,
  audio,
  onClose,
}: {
  rotulo: string;
  texto: string;
  audio: AudioRecado | null;
  onClose: () => void;
}) {
  const fecharRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fecharRef.current?.focus();
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = antes;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={rotulo}
      className="fixed inset-0 z-50 flex flex-col bg-bg font-corpo text-ink"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="tipo-label m-0 text-acento-texto">{rotulo}</p>
        <button
          ref={fecharRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Fechar"
          className="grid size-11 place-items-center rounded-full text-ink-2 transition-colors hover:text-ink"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        className="flex flex-1 flex-col justify-center gap-6 px-7 pb-[max(2.5rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="m-0 font-titulo text-[clamp(1.6rem,6vw,2.4rem)] font-light leading-tight tracking-titulo text-ink">
          {texto}
        </p>
        {audio && <VoiceNotePlayer audio={audio} tamanho="lg" />}
      </div>
    </div>
  );
}
