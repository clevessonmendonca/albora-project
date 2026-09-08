"use client";

import type { ReactNode } from "react";
import { Dialog } from "./dialog";
import { Button } from "./button";

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  /** Gate de validação do chamador (ex.: motivo vazio) — mesma disciplina de `podeConfirmar` em `DangerDialog`, só que aqui o campo controlado vive fora, na `description`. */
  confirmDisabled?: boolean;
};

/**
 * Confirmação genérica para uma ação que tem consequência mas não é
 * irreversível ao ponto de exigir `DangerDialog` (T8) — ex.: revelar PII,
 * mudar status de ticket. Nunca usada para exclusão de conta.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  pending,
  confirmDisabled,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="confirm-dialog-title">
      <div className="elev-2 mx-auto flex w-full max-w-[28rem] flex-col gap-4 rounded-superficie border border-linha bg-superficie p-6">
        <h2 id="confirm-dialog-title" className="tipo-den-titulo m-0">
          {title}
        </h2>
        {description && <div className="tipo-den-corpo text-ink-2">{description}</div>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={pending || confirmDisabled}>
            {pending ? "Aguarde…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
