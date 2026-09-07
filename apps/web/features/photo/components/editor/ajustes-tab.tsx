"use client";

import type { AjustesManuais } from "@albora/core";
import { Slider } from "@albora/ui-web";
import type { Dispatch, SetStateAction } from "react";
import { PASSOS_BIPOLAR, PASSOS_UNIPOLAR } from "../client/editor-lut";

type AjustesTabProps = {
  ajustes: AjustesManuais;
  onAjustes: Dispatch<SetStateAction<AjustesManuais>>;
};

/**
 * Aba de ajustes manuais (luz, calor, contraste, vinheta).
 * 4 sliders premium com ranges diferentes; luz/calor/contraste nascem no
 * neutro central (bipolar), vinheta parte de zero.
 */
export function AjustesTab({ ajustes, onAjustes }: AjustesTabProps) {
  return (
    <div className="grid gap-2.5">
      <Slider
        label="Luz"
        min={-PASSOS_BIPOLAR}
        max={PASSOS_BIPOLAR}
        value={ajustes.luz}
        onChange={(v) => onAjustes((a) => ({ ...a, luz: v }))}
        bipolar
      />
      <Slider
        label="Calor"
        min={-PASSOS_BIPOLAR}
        max={PASSOS_BIPOLAR}
        value={ajustes.calor}
        onChange={(v) => onAjustes((a) => ({ ...a, calor: v }))}
        bipolar
      />
      <Slider
        label="Contraste"
        min={-PASSOS_BIPOLAR}
        max={PASSOS_BIPOLAR}
        value={ajustes.contraste}
        onChange={(v) => onAjustes((a) => ({ ...a, contraste: v }))}
        bipolar
      />
      <Slider
        label="Vinheta"
        min={0}
        max={PASSOS_UNIPOLAR}
        value={ajustes.vinheta}
        onChange={(v) => onAjustes((a) => ({ ...a, vinheta: v }))}
      />
    </div>
  );
}
