"use client";

import React, { useState } from "react";
import { ConfirmDialog } from "@albora/ui-web";

type RemoverFotoDialogProps = {
  aberto: boolean;
  enviada: boolean;
  onFechar: () => void;
  onConfirmar: () => Promise<boolean>;
};

export function RemoverFotoDialog({
  aberto,
  enviada,
  onFechar,
  onConfirmar,
}: RemoverFotoDialogProps) {
  const [removendo, setRemovendo] = useState(false);
  const [falhou, setFalhou] = useState(false);

  const confirmar = async () => {
    setRemovendo(true);
    setFalhou(false);
    const ok = await onConfirmar();
    setRemovendo(false);
    if (!ok) setFalhou(true);
  };

  const fechar = () => {
    setFalhou(false);
    onFechar();
  };

  return (
    <ConfirmDialog
      open={aberto}
      onClose={fechar}
      onConfirm={() => void confirmar()}
      title={enviada ? "Remover esta foto?" : "Descartar esta foto?"}
      description={
        <>
          <p className="m-0">
            {enviada
              ? "Ela sai do álbum e do telão. Não dá para desfazer."
              : "Ela ainda não foi enviada e será descartada do seu celular."}
          </p>
          {falhou && (
            <p role="alert" className="m-0 mt-2 text-critico">
              Não deu para remover agora. Tente de novo.
            </p>
          )}
        </>
      }
      confirmLabel={enviada ? "Remover" : "Descartar"}
      cancelLabel="Manter"
      tone="danger"
      pending={removendo}
    />
  );
}
