"use client";

import React from "react";
import { CAPAS_FOCO, type CapaFoco } from "@albora/core";

const ROTULO_VERTICAL: Record<CapaFoco, string> = { 25: "Mais alto", 50: "Centro", 75: "Mais baixo" };
const ROTULO_HORIZONTAL: Record<CapaFoco, string> = { 25: "Esquerda", 50: "Centro", 75: "Direita" };

function Grupo({
  nome,
  rotulos,
  value,
  onChange,
}: {
  nome: string;
  rotulos: Record<CapaFoco, string>;
  value: CapaFoco;
  onChange: (foco: CapaFoco) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="tipo-caption text-ink-3">{nome}</span>
      <div role="radiogroup" aria-label={nome} className="inline-flex w-fit rounded-pilula border border-linha bg-superficie p-1">
        {CAPAS_FOCO.map((foco) => (
          <button
            key={foco}
            type="button"
            role="radio"
            aria-checked={value === foco}
            onClick={() => onChange(foco)}
            className={`tipo-label rounded-pilula px-3.5 py-1.5 transition-colors ${
              value === foco ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"
            }`}
          >
            {rotulos[foco]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CapaFocoField({
  value,
  onChange,
  valueX,
  onChangeX,
}: {
  value: CapaFoco;
  onChange: (foco: CapaFoco) => void;
  valueX: CapaFoco;
  onChangeX: (foco: CapaFoco) => void;
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="p-0 text-sm font-medium text-ink">Enquadramento da capa</legend>
      <Grupo nome="Vertical" rotulos={ROTULO_VERTICAL} value={value} onChange={onChange} />
      <Grupo nome="Horizontal" rotulos={ROTULO_HORIZONTAL} value={valueX} onChange={onChangeX} />
      <p className="tipo-caption m-0 text-ink-3">Ajuste para manter as pessoas em destaque na capa.</p>
    </fieldset>
  );
}
