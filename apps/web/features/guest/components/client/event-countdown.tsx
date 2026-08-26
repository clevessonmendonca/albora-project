"use client";

import { useEffect, useState } from "react";

function calcTexto(isoAt: string): string {
  const at = new Date(isoAt);
  const diff = at.getTime() - Date.now();

  if (diff <= 0) return "agora";

  const totalMin = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;

  if (hours < 24) {
    if (hours === 0) return `em ${minutes} min`;
    if (minutes === 0) return `em ${hours} h`;
    return `em ${hours} h ${minutes} min`;
  }

  return at.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Contagem regressiva até o início do evento.
 *
 * Atualiza a cada 30 s enquanto estiver na tela. Para eventos a mais de 24 h,
 * exibe data e hora por extenso; dentro das 24 h exibe "em X h Y min" para
 * dar a sensação correta de proximidade.
 */
export function EventCountdown({ at }: { at: string }) {
  const [texto, setTexto] = useState(() => calcTexto(at));

  useEffect(() => {
    const id = setInterval(() => setTexto(calcTexto(at)), 30_000);
    return () => clearInterval(id);
  }, [at]);

  return (
    <p className="mt-6 font-titulo text-[0.78rem] font-normal uppercase tracking-[0.2em] text-acento-texto">
      {texto}
    </p>
  );
}
