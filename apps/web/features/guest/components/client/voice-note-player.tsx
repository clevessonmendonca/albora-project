"use client";

import React, { useRef, useState } from "react";
import type { AudioRecado } from "@/features/guest/hooks/use-guestbook";

function formatar(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Player do áudio do recado — degrada fechando (some) se o áudio falha; nunca bloqueia o texto,
 *  que é o corpo (o áudio emociona quem tem fone ou abre no dia seguinte). Reusado no card da capa
 *  e no recado-como-story. `tamanho` ajusta o botão para o contexto full-screen. */
export function VoiceNotePlayer({
  audio,
  tamanho = "sm",
}: {
  audio: AudioRecado;
  tamanho?: "sm" | "lg";
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    void el.play().then(
      () => setPlaying(true),
      () => setFailed(true),
    );
  };

  const grande = tamanho === "lg";

  return (
    <div className="flex items-center gap-2.5">
      <audio
        ref={ref}
        src={audio.url}
        preload="none"
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar recado" : "Ouvir recado"}
        className={`relative grid shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-acento text-sobre-acento shadow-suave transition-[opacity,transform] duration-instantaneo ease-mola before:absolute before:-inset-1.5 before:content-[''] hover:opacity-90 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100 ${
          grande ? "size-12 text-sm" : "size-8 text-[0.65rem]"
        }`}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <span className={grande ? "tipo-body text-ink-2" : "tipo-caption text-ink-3"}>
        {formatar(audio.duracaoSegundos)}
      </span>
    </div>
  );
}
