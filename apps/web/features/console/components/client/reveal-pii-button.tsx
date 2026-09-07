"use client";

import React, { useState, useTransition } from "react";
import { Button, ConfirmDialog, TextField } from "@albora/ui-web";
import { revealAccountPiiAction } from "@/features/console/actions";

/**
 * Ação pontual, não um modo: revelar devolve o e-mail uma vez para este
 * render; não existe estado "desmascarado" persistente nem toggle de volta.
 * Recarregar a tela volta ao mascarado — é a auditoria que registra que a
 * revelação aconteceu, não um flag de UI.
 */
export function RevealPiiButton({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (revealed) {
    return <span className="tipo-den-corpo text-ink">{revealed}</span>;
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Revelar contato
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            const resultado = await revealAccountPiiAction(accountId, reason);
            if (resultado.ok) {
              setRevealed(resultado.email);
              setOpen(false);
            } else {
              setError(resultado.error);
            }
          })
        }
        title="Revelar contato do titular?"
        description={
          <div className="flex flex-col gap-3">
            <p className="m-0">Isso grava uma entrada na auditoria com o motivo abaixo.</p>
            <TextField
              label="Motivo"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex.: ticket #42 — confirmar e-mail de cobrança"
            />
            {error && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                {error}
              </p>
            )}
          </div>
        }
        pending={pending}
        confirmLabel="Revelar"
      />
    </>
  );
}
