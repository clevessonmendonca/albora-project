"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, DangerDialog } from "@albora/ui-web";
import { deleteAccountAction } from "@/features/console/actions";

/**
 * O comando mais perigoso do console (T8): irreversível, apaga bytes, e
 * erra para os dois lados. `DangerDialog` exige digitar o id da conta de
 * volta — nunca aceito por padrão — e um motivo, antes de habilitar o
 * botão. `reauthRequired` manda para o step-up com `next` de volta pra
 * esta conta; a política de reautenticação vale mesmo para `owner`.
 */
export function DeleteAccountDanger({ accountId, maskedEmail }: { accountId: string; maskedEmail: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Excluir conta
      </Button>
      <DangerDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={(reason) =>
          startTransition(async () => {
            const resultado = await deleteAccountAction(accountId, reason);
            if (resultado.ok) {
              router.push("/console/accounts");
            } else if (resultado.reauthRequired) {
              window.location.assign(`/console/reauth?next=${encodeURIComponent(`/console/accounts/${accountId}`)}`);
            } else {
              setError(resultado.error);
            }
          })
        }
        title="Excluir esta conta de verdade?"
        whatWillBeDeleted={
          <div className="flex flex-col gap-3">
            <ul className="m-0 list-disc pl-5">
              <li>Todos os eventos desta conta e seus dados no banco.</li>
              <li>As fotos armazenadas (bytes no object storage).</li>
              <li>Tokens de conexão com o Google Drive, revogados.</li>
              <li>Isso é irreversível.</li>
            </ul>
            {error && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                {error}
              </p>
            )}
          </div>
        }
        confirmationValue={accountId}
        pending={pending}
      />
      <p className="tipo-caption m-0 mt-2 text-ink-3">
        Conta: {maskedEmail} — digite o id ({accountId}) para confirmar.
      </p>
    </>
  );
}
