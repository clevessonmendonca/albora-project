"use client";

import React from "react";
import { CAPAS_FOCO, type CapaFoco } from "@albora/core";

const ROTULO: Record<CapaFoco, string> = { 25: "Mais alto", 50: "Centro", 75: "Mais baixo" };

export function CapaFocoField({ value, onChange }: { value: CapaFoco; onChange: (foco: CapaFoco) => void }) {
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="p-0 text-sm font-medium text-ink">Enquadramento da capa</legend>
      <div role="radiogroup" aria-label="Enquadramento da capa" className="inline-flex w-fit rounded-pilula border border-linha bg-superficie p-1">
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
            {ROTULO[foco]}
          </button>
        ))}
      </div>
      <p className="tipo-caption m-0 text-ink-3">Ajuste para manter as pessoas em destaque na capa.</p>
    </fieldset>
  );
}
