"use client";

import React, { useEffect, useState } from "react";

const SEGUNDO = 1_000;
const MINUTO = 60 * SEGUNDO;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

type Unidades = { dias: number; horas: number; minutos: number; segundos: number };

function decompor(falta: number): Unidades {
  const restoDia = falta % DIA;
  const restoHora = restoDia % HORA;
  return {
    dias: Math.floor(falta / DIA),
    horas: Math.floor(restoDia / HORA),
    minutos: Math.floor(restoHora / MINUTO),
    segundos: Math.floor((restoHora % MINUTO) / SEGUNDO),
  };
}

/** Painel de contagem regressiva do hero — dias/horas/min/seg, sempre os 4, como no protótipo. */
export function ContagemRegressiva({ paraISO }: { paraISO: string }) {
  const alvo = new Date(paraISO).getTime();
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), SEGUNDO);
    return () => window.clearInterval(id);
  }, []);

  const falta = alvo - agora;

  if (falta <= 0) {
    return (
      <p role="timer" aria-live="off" className="m-0">
        <span className="tipo-subtitle text-ink">A festa começou</span>
      </p>
    );
  }

  const { dias, horas, minutos, segundos } = decompor(falta);

  return (
    <div role="timer" aria-live="off" className="grid grid-cols-4 gap-3 text-center">
      <UnidadeDoTempo valor={dias} rotulo="dias" />
      <UnidadeDoTempo valor={horas} rotulo="horas" />
      <UnidadeDoTempo valor={minutos} rotulo="min" />
      <UnidadeDoTempo valor={segundos} rotulo="seg" />
    </div>
  );
}

function UnidadeDoTempo({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div>
      <b className="tipo-display block leading-none text-ink">{valor}</b>
      <span className="tipo-label mt-1 block text-ink-2">{rotulo}</span>
    </div>
  );
}
