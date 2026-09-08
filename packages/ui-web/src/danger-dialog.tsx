"use client";

import { useState, type ReactNode } from "react";
import { Dialog } from "./dialog";
import { Button } from "./button";
import { TextField } from "./text-field";

export type DangerDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  /** Diz em texto o que será apagado — irreversível merece atrito, nunca surpresa (spec §12). */
  whatWillBeDeleted: ReactNode;
  /** O identificador que o operador precisa digitar de volta — nunca aceito por padrão, sempre por cópia manual. */
  confirmationValue: string;
  pending?: boolean;
};

/**
 * Mais estrito que `ConfirmDialog`: exige digitar de volta o identificador
 * da entidade E um motivo — os dois, não um ou outro — antes de habilitar
 * o botão. Reservado para ações irreversíveis (exclusão de conta, T8);
 * `ConfirmDialog` continua para o resto.
 */
export function DangerDialog({
  open,
  onClose,
  onConfirm,
  title,
  whatWillBeDeleted,
  confirmationValue,
  pending,
}: DangerDialogProps) {
  const [digitado, setDigitado] = useState("");
  const [motivo, setMotivo] = useState("");
  const podeConfirmar = digitado === confirmationValue && motivo.trim().length > 0;

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="danger-dialog-title">
      <div className="elev-2 mx-auto flex w-full max-w-[30rem] flex-col gap-4 rounded-superficie border border-critico bg-superficie p-6">
        <h2 id="danger-dialog-title" className="tipo-den-titulo m-0 text-critico">
          {title}
        </h2>
        <div className="tipo-den-corpo text-ink-2">{whatWillBeDeleted}</div>
        <TextField
          label={`Digite "${confirmationValue}" para confirmar`}
          value={digitado}
          onChange={(e) => setDigitado(e.target.value)}
          disabled={pending}
        />
        <TextField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={pending} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => onConfirm(motivo)} disabled={pending || !podeConfirmar}>
            {pending ? "Excluindo…" : "Excluir de verdade"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
