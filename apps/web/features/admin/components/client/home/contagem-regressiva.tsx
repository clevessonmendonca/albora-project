"use client";

import { useEffect, useState } from "react";

/**
 * A contagem até a festa, viva.
 *
 * O painel dizia "Faltam 25 dias" — verdade, e inerte. O protótipo mostra
 * dias, horas, minutos e segundos correndo, e isso muda o que a tela é: de
 * relatório para véspera.
 *
 * Não conta como movimento no sentido do §6 ("existe em exatamente dois
 * lugares"). Ali a regra trata de animação — bounce, escala, varredura. Aqui
 * é dado mudando de valor, sem transição nenhuma; os números trocam como o
 * relógio do celular troca.
 *
 * `tabular-nums` é o que impede a linha de dançar quando 09 vira 10.
 */

type Restante = { dias: number; horas: number; minutos: number; segundos: number };

function restanteAte(alvo: number, agora: number): Restante | null {
  const ms = alvo - agora;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return {
    dias: Math.floor(s / 86400),
    horas: Math.floor((s % 86400) / 3600),
    minutos: Math.floor((s % 3600) / 60),
    segundos: s % 60,
  };
}

function Casa({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-titulo text-[clamp(1.75rem,5vw,2.75rem)] font-[var(--peso-display)] leading-none tabular-nums text-ink">
        {String(valor).padStart(2, "0")}
      </span>
      <span className="tipo-label text-ink-3">{rotulo}</span>
    </div>
  );
}

export function ContagemRegressiva({ comecaEm }: { comecaEm: string }) {
  const alvo = new Date(comecaEm).getTime();
  // Só depois de montar: o servidor e o cliente nunca vão concordar sobre "agora".
  const [restante, setRestante] = useState<Restante | null>(null);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    setRestante(restanteAte(alvo, Date.now()));
    const id = setInterval(() => setRestante(restanteAte(alvo, Date.now())), 1000);
    return () => clearInterval(id);
  }, [alvo]);

  if (!montado || !restante) return null;

  return (
    <section aria-label="Contagem até a festa" className="flex flex-col gap-3">
      <span className="tipo-label text-ink-3">Contagem regressiva</span>
      <div className="grid grid-cols-4 gap-2">
        <Casa valor={restante.dias} rotulo="dias" />
        <Casa valor={restante.horas} rotulo="horas" />
        <Casa valor={restante.minutos} rotulo="min" />
        <Casa valor={restante.segundos} rotulo="seg" />
      </div>
    </section>
  );
}
