"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@albora/ui-web";
import {
  buscarRecado,
  comFalha,
  comTela,
  dispensar,
  estadoInicial,
  marcarRecadoLido,
  recortarTexto,
} from "@/features/guest/hooks/use-guestbook";
import { VoiceNotePlayer } from "./voice-note-player";

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
    <article className="elev-1 mx-[1.125rem] mt-4 mb-4 rounded-token px-4 py-3.5">
      <div className="flex items-start gap-3">
        <Avatar name={hostName} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="tipo-label m-0 uppercase text-acento-texto">{label}</p>
          {estado.audio ? (
            <div className="mt-2">
              <VoiceNotePlayer audio={estado.audio} />
            </div>
          ) : null}
          <p className="mb-0 mt-1.5 tipo-caption leading-snug text-ink">{corpo}</p>
          {cortado && !expandido ? (
            <button
              type="button"
              onClick={() => setExpandido(true)}
              className="-ml-1 mt-1 flex min-h-11 cursor-pointer items-center border-0 bg-transparent px-1 tipo-caption text-acento-texto transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70"
            >
              ver inteiro
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={fechar}
          aria-label="Seguir"
          className="-mr-1 -mt-1 flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent px-1 tipo-caption text-ink-3 transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70"
        >
          Seguir
        </button>
      </div>
    </article>
  );
}

