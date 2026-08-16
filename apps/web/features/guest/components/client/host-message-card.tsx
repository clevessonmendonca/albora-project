"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@albora/ui-web";
import {
  buscarRecado,
  comFalha,
  comTela,
  dispensar,
  estadoInicial,
  marcarRecadoLido,
  recortarTexto,
  type AudioRecado,
} from "@/features/guest/hooks/use-guestbook";

export function HostMessageCard({
  label,
  hostName,
}: {
  label: string;
  hostName: string;
}) {
  const [estado, setEstado] = useState(estadoInicial);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await buscarRecado();
      setEstado((e) => (r.ok ? comTela(e, r.mostrar, r.texto, r.audio) : comFalha(e, r.falha)));
    })();
  }, []);

  const fechar = useCallback(() => {
    setEstado(dispensar);
    void marcarRecadoLido();
  }, []);

  if (!estado.mostrar || estado.texto === null) return null;

  const { visivel, cortado } = recortarTexto(estado.texto);
  const corpo = expandido ? estado.texto : visivel;

  return (
    <article className="mx-[1.125rem] mt-4 mb-4 rounded-token bg-superficie px-4 py-3.5">
      <div className="flex items-start gap-3">
        <Avatar name={hostName} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[0.625rem] uppercase tracking-rotulo text-acento-texto">{label}</p>
          {estado.audio ? <VoiceNotePlayer audio={estado.audio} /> : null}
          <p className="mb-0 mt-1.5 text-[0.84375rem] leading-snug text-ink">{corpo}</p>
          {cortado && !expandido ? (
            <button
              type="button"
              onClick={() => setExpandido(true)}
              className="mt-1.5 cursor-pointer border-0 bg-transparent p-0 text-[0.75rem] text-acento-texto"
            >
              ver inteiro
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={fechar}
          aria-label="Seguir"
          className="cursor-pointer border-0 bg-transparent p-0 text-[0.75rem] text-ink-3"
        >
          Seguir
        </button>
      </div>
    </article>
  );
}

function formatar(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function VoiceNotePlayer({ audio }: { audio: AudioRecado }) {
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

  return (
    <div className="mt-2 flex items-center gap-2">
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
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-acento text-[0.65rem] text-sobre-acento"
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <span className="text-[0.75rem] text-ink-3">{formatar(audio.duracaoSegundos)}</span>
    </div>
  );
}
