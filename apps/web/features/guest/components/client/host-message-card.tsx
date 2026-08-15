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
      setEstado((e) => (r.ok ? comTela(e, r.mostrar, r.texto) : comFalha(e, r.falha)));
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
