"use client";

import { useState } from "react";
import { CONSENTIMENTO_EXTERNO_VIGENTE, textoDoConsentimento } from "@albora/core";
import {
  BottomSheet,
  Button,
  ConsentCheckbox,
} from "@albora/ui-web";

// Fonte da verdade em @albora/core: mesmo texto que o painel de auditoria
// LGPD do anfitrião lê.
const TEXTO_CONSENTIMENTO_EXTERNO =
  textoDoConsentimento("externo", CONSENTIMENTO_EXTERNO_VIGENTE) ?? "";

export function ShareConsentSheet({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (nomeNaMoldura: boolean) => void;
}) {
  const [nomeNaMoldura, setNomeNaMoldura] = useState(true);

  return (
    <BottomSheet
      title="Compartilhar fora da festa"
      titleId="consentimento-externo-titulo"
      open={open}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3">
          <Button variant="primary" size="md" width="full" onClick={() => onConfirm(nomeNaMoldura)}>
            Continuar
          </Button>
          <Button variant="secondary" size="md" width="full" onClick={onClose}>
            Agora não
          </Button>
        </div>
      }
    >
      <p className="m-0 text-t-body leading-relaxed text-ink-2">{TEXTO_CONSENTIMENTO_EXTERNO}</p>
      <ConsentCheckbox checked={nomeNaMoldura} onChange={setNomeNaMoldura}>
        Incluir meu primeiro nome na moldura
      </ConsentCheckbox>
    </BottomSheet>
  );
}
