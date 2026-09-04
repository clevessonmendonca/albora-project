"use client";

import type { Preset } from "@albora/core";
import { FilterChip, Slider } from "@albora/ui-web";
import { SEM_FILTRO, PASSOS_UNIPOLAR } from "../client/editor-lut";

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
 * Tira horizontal de chips com preview real da foto + slider de intensidade.
 * A cor sai só de LUT no cliente (ADR 0007) — trocar de chip já é a edição inteira.
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
    <div className="grid gap-3">
      <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip
          label="Original"
          thumbnail={tiras.get(SEM_FILTRO)}
          active={escolhido === null}
          onClick={() => onEscolhido(null)}
        />
        {presets.map((p) => (
          <FilterChip
            key={p.id}
            label={p.nome}
            thumbnail={tiras.get(p.id)}
            active={escolhido?.id === p.id}
            suggested={p.id === recomendadoId}
            onClick={() => {
              onEscolhido(p);
              onIntensidade(1);
            }}
          />
        ))}
      </div>

      {escolhido && (
        <Slider
          label="Intensidade"
          min={0}
          max={PASSOS_UNIPOLAR}
          value={intensidade}
          onChange={onIntensidade}
        />
      )}
    </div>
  );
}
