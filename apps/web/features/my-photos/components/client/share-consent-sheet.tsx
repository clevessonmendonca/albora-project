"use client";

import { useState } from "react";
import {
  BottomSheet,
  Button,
  ConsentCheckbox,
} from "@albora/ui-web";

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
      title="Postar fora da festa"
      titleId="consentimento-externo-titulo"
      open={open}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" size="md" width="full" onClick={onClose}>
            Agora não
          </Button>
          <Button variant="primary" size="md" width="full" onClick={() => onConfirm(nomeNaMoldura)}>
            Aceitar e postar
          </Button>
        </div>
      }
    >
      <p className="m-0 text-[0.9rem] leading-normal text-ink-2">
        A foto sai com a moldura desta festa: monograma, nomes, data e o endereço da
        Albora. No Instagram ou no WhatsApp, quem receber pode guardar para sempre — não
        dá para desfazer.
      </p>
      <ConsentCheckbox checked={nomeNaMoldura} onChange={setNomeNaMoldura}>
        Incluir meu primeiro nome na moldura
      </ConsentCheckbox>
    </BottomSheet>
  );
}
