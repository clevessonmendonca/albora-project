"use client";

import type { Preset } from "@albora/core";
import { SEM_FILTRO, PASSOS_UNIPOLAR } from "../client/editor-lut";
import { Chip } from "./chip";
import { Deslizante } from "./deslizante";

type FiltrosTabProps = {
  escolhido: Preset | null;
  onEscolhido: (preset: Preset | null) => void;
  intensidade: number;
  onIntensidade: (valor: number) => void;
  presets: readonly Preset[];
  recomendadoId: string | null;
  tiras: Map<string, string>;
};

/**
 * Aba de filtros (LUTs).
 * Lista horizontal de chips + slider de intensidade.
 */
export function FiltrosTab({
  escolhido,
  onEscolhido,
  intensidade,
  onIntensidade,
  presets,
  recomendadoId,
  tiras,
}: FiltrosTabProps) {
  return (
    <>
      <div className="flex gap-2.5 overflow-x-auto pb-1.5 [scrollbar-width:none]">
        <Chip
          rotulo="Original"
          miniatura={tiras.get(SEM_FILTRO)}
          ativo={escolhido === null}
          onClick={() => onEscolhido(null)}
        />
        {presets.map((p) => (
          <Chip
            key={p.id}
            rotulo={p.nome}
            miniatura={tiras.get(p.id)}
            ativo={escolhido?.id === p.id}
            sugerido={p.id === recomendadoId}
            onClick={() => {
              onEscolhido(p);
              onIntensidade(1);
            }}
          />
        ))}
      </div>

      {escolhido && (
        <Deslizante
          rotulo="Intensidade"
          min={0}
          max={PASSOS_UNIPOLAR}
          valor={intensidade}
          onMudar={onIntensidade}
        />
      )}
    </>
  );
}
