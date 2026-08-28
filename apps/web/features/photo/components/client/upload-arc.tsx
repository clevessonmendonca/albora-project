"use client";

import { useEffect, useState } from "react";

/** Sem id nem gradiente — id de SVG inline é global (conflitaria com `.flash`), e o degradê seria âmbar fixo quando o acento do evento pode ser outro. */

/** π × 21. O arco é o semicírculo de raio 21 do pacote de marca. */
const COMPRIMENTO = 65.97;

const ESTILO = `
.arco-envio-traco { transition: stroke-dashoffset var(--tempo-rapido) var(--curva); }
.arco-envio-rotulo {
  font-family: var(--fonte-titulo);
  font-size: 0.6rem;
  font-weight: 400;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-3);
}
@media (prefers-reduced-motion: reduce) {
  .arco-envio-traco { transition: none; }
}
`;

export function UploadArc({
  pendentes,
  bytesPendentes,
  online,
  lado = 40,
}: {
  pendentes: number;
  bytesPendentes: number;
  online: boolean;
  lado?: number | undefined;
}) {
  // Pico é o total de bytes que a fila já teve nesta rodada — sem ele não há denominador, já que a fila só informa o que falta.
  const [pico, setPico] = useState(0);

  useEffect(() => {
    setPico((p) => (pendentes === 0 ? 0 : Math.max(p, bytesPendentes)));
  }, [pendentes, bytesPendentes]);

  if (pendentes === 0 && online) return null;

  const fracao = pico > 0 ? Math.min(1, Math.max(0, (pico - bytesPendentes) / pico)) : 0;

  return (
    <>
      <style>{ESTILO}</style>

      <span
        role="status"
        aria-label={rotulo(pendentes, online)}
        className="inline-flex items-center gap-[calc(var(--espaco)*2)]"
      >
        <svg viewBox="0 0 64 64" width={lado} height={lado} aria-hidden="true">
          <path
            d="M11 42 A21 21 0 0 1 53 42"
            fill="none"
            stroke="var(--linha)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            className="arco-envio-traco"
            d="M11 42 A21 21 0 0 1 53 42"
            fill="none"
            stroke="var(--acento)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray={COMPRIMENTO}
            strokeDashoffset={(COMPRIMENTO * (1 - fracao)).toFixed(2)}
          />
        </svg>

        {!online && <span className="arco-envio-rotulo">Sem sinal</span>}
      </span>
    </>
  );
}

function rotulo(pendentes: number, online: boolean): string {
  const fila =
    pendentes === 0
      ? "Nenhuma foto na fila"
      : pendentes === 1
        ? "1 foto subindo"
        : `${pendentes} fotos subindo`;

  return online ? fila : `Sem sinal. ${fila}`;
}
