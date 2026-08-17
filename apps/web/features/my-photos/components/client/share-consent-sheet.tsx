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
      <p className="m-0 text-t-body leading-relaxed text-ink-2">
        A foto vai sair com a moldura desta festa: monograma, nomes, data e o
        endereço da Albora. Quem receber no Instagram ou WhatsApp pode guardar
        para sempre — não dá para desfazer depois.
      </p>
      <ConsentCheckbox checked={nomeNaMoldura} onChange={setNomeNaMoldura}>
        Incluir meu primeiro nome na moldura
      </ConsentCheckbox>
    </BottomSheet>
  );
}
