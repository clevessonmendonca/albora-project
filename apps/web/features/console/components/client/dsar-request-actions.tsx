"use client";

import React, { useState, useTransition } from "react";
import { Button, ConfirmDialog, Select, TextField } from "@albora/ui-web";
import type { DsarRequestRow, DsarStatus } from "@albora/db";
import { updateDsarRequestAction } from "@/features/console/actions";

const ROTULO_STATUS: Record<DsarStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  completed: "Concluído",
  refused: "Recusado",
};

/**
 * Atribuir, mudar status, anexar comprovante e concluir são o mesmo comando
 * (`updateDsarRequest`) — um diálogo só, não quatro botões. Diferente da
 * mesa de suporte (T5), aqui o motivo é sempre digitado: LGPD pede a
 * justificativa por extenso na trilha, o comando não deriva um sozinho.
 */
export function DsarRequestActions({ row }: { row: DsarRequestRow }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<DsarStatus>(row.status);
  const [evidenceUrl, setEvidenceUrl] = useState(row.evidenceUrl ?? "");
  const [notes, setNotes] = useState(row.notes ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function fechar() {
    setOpen(false);
    setError(null);
    setReason("");
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Atualizar
      </Button>
      <ConfirmDialog
        open={open}
        onClose={fechar}
        onConfirm={() => {
          if (!reason.trim()) {
            setError("motivo é obrigatório para registrar a mudança");
            return;
          }
          startTransition(async () => {
            const resultado = await updateDsarRequestAction(row.id, reason, {
              status,
              evidenceUrl: evidenceUrl.trim() || null,
              notes: notes.trim() || null,
            });
            if (resultado.ok) {
              fechar();
            } else {
              setError(resultado.error);
            }
          });
        }}
        title="Atualizar pedido"
        description={
          <div className="flex flex-col gap-3">
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as DsarStatus)}>
              {Object.entries(ROTULO_STATUS).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Select>
            <TextField
              label="Comprovante (link)"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="link do export/atendimento"
            />
            <TextField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <TextField
              label="Motivo"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex.: exportado e enviado ao titular por e-mail"
            />
            {error && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                {error}
              </p>
            )}
          </div>
        }
        pending={pending}
        confirmLabel="Salvar"
      />
    </>
  );
}
