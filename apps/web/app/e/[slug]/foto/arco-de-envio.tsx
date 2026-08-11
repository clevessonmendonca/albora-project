"use client";

import { useEffect, useState } from "react";

/**
 * O arco de `brand/animadas/loader-progresso.svg`, controlado pela fila.
 *
 * Mesma geometria da marca: o arco se traça enquanto a foto sobe, e é o gesto
 * do logotipo nascendo (`DESIGN.md` §1b). Nada de id nem de gradiente aqui —
 * classe e id de SVG embutido são globais no documento, e `.flash` do
 * `logo-animado-*` desligaria o flash da captura sem avisar.
 *
 * O traço é chapado, e não o degradê do arquivo, por duas razões: abaixo de
 * 32px o degradê vira cor chapada de qualquer forma (§1b), e o degradê do
 * pacote é âmbar fixo — nenhum componente pode assumir que o acento do evento
 * é âmbar.
 */

/** π × 21. O arco é o semicírculo de raio 21 do pacote de marca. */
const COMPRIMENTO = 65.97;

const ESTILO = `
.arco-envio-traco { transition: stroke-dashoffset 300ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .arco-envio-traco { transition: none; }
}
`;

export function ArcoDeEnvio({
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
  // O pico é o total de bytes que a fila já teve nesta rodada. Sem ele não há
  // denominador: a fila só informa o que **falta**, e uma foto nova entrando
  // encolheria a barra em vez de alongá-la.
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
        style={{ display: "inline-flex", alignItems: "center", gap: "calc(var(--espaco) * 2)" }}
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

        {!online && <span style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}>sem sinal</span>}
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
