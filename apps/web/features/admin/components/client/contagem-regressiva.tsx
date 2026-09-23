"use client";

import React, { useEffect, useState } from "react";

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

type Restante = { valor: number; unidade: string } | null;

function restanteAte(alvo: number, agora: number): Restante {
  const falta = alvo - agora;
  if (falta <= 0) return null;
  if (falta >= DIA) {
    const dias = Math.floor(falta / DIA);
    return { valor: dias, unidade: dias === 1 ? "dia" : "dias" };
  }
  if (falta >= HORA) {
    const horas = Math.floor(falta / HORA);
    return { valor: horas, unidade: horas === 1 ? "hora" : "horas" };
  }
  const minutos = Math.max(1, Math.floor(falta / MINUTO));
  return { valor: minutos, unidade: minutos === 1 ? "minuto" : "minutos" };
}

export function ContagemRegressiva({ paraISO }: { paraISO: string }) {
  const alvo = new Date(paraISO).getTime();
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), MINUTO);
    return () => window.clearInterval(id);
  }, []);

  const restante = restanteAte(alvo, agora);

  return (
    <p role="timer" aria-live="off" className="m-0 flex items-baseline gap-2">
      {restante ? (
        <>
          <span className="tipo-display leading-none text-ink">{restante.valor}</span>
          <span className="tipo-caption text-ink-3">{restante.unidade}</span>
        </>
      ) : (
        <span className="tipo-subtitle text-ink">A festa começou</span>
      )}
    </p>
  );
}
