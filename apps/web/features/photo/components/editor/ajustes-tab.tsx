"use client";

import type { AjustesManuais } from "@albora/core";
import type { Dispatch, SetStateAction } from "react";
import { PASSOS_BIPOLAR, PASSOS_UNIPOLAR } from "../client/editor-lut";
import { Deslizante } from "./deslizante";

type AjustesTabProps = {
  ajustes: AjustesManuais;
  onAjustes: Dispatch<SetStateAction<AjustesManuais>>;
};

/**
 * Aba de ajustes manuais (luz, calor, contraste, vinheta).
 * 4 sliders com ranges diferentes.
 */
export function AjustesTab({ ajustes, onAjustes }: AjustesTabProps) {
  return (
    <div>
      <Deslizante
        rotulo="Luz"
        min={-PASSOS_BIPOLAR}
        max={PASSOS_BIPOLAR}
        valor={ajustes.luz}
        onMudar={(v) => onAjustes((a) => ({ ...a, luz: v }))}
      />
      <Deslizante
        rotulo="Calor"
        min={-PASSOS_BIPOLAR}
        max={PASSOS_BIPOLAR}
        valor={ajustes.calor}
        onMudar={(v) => onAjustes((a) => ({ ...a, calor: v }))}
      />
      <Deslizante
        rotulo="Contraste"
        min={-PASSOS_BIPOLAR}
        max={PASSOS_BIPOLAR}
        valor={ajustes.contraste}
        onMudar={(v) => onAjustes((a) => ({ ...a, contraste: v }))}
      />
      <Deslizante
        rotulo="Vinheta"
        min={0}
        max={PASSOS_UNIPOLAR}
        valor={ajustes.vinheta}
        onMudar={(v) => onAjustes((a) => ({ ...a, vinheta: v }))}
      />
    </div>
  );
}
