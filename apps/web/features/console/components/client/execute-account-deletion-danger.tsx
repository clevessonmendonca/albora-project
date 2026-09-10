"use client";

import React, { useState, useTransition } from "react";
import { Button, DangerDialog } from "@albora/ui-web";
import type { DsarRequestRow } from "@albora/db";
import { deleteAccountAction } from "@/features/console/actions";

/**
 * Único botão do console que apaga uma conta de verdade (T8) — só aparece
 * na linha de um pedido DSAR `kind = "deletion"` ainda aberto ou em
 * andamento (ver `LgpdPage`). `deleteAccountAction` confere de novo, dentro
 * da própria transação, que este pedido autoriza a purga; esconder o botão
 * quando o pedido já foi concluído/recusado só evita mostrar uma ação que a
 * aplicação já vai negar.
 *
 * `reauthRequired` manda para o step-up com `next` de volta pra esta tela —
 * a política de reautenticação (`lgpd.delete_account`) vale mesmo pro
 * `owner`.
 */
export function ExecuteAccountDeletionDanger({ row }: { row: DsarRequestRow }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Executar exclusão
      </Button>
      <DangerDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={(reason) =>
          startTransition(async () => {
            const resultado = await deleteAccountAction(row.subjectAccountId, row.id, reason);
            if (resultado.ok) {
              setOpen(false);
            } else if (resultado.reauthRequired) {
              window.location.assign(`/console/reauth?next=${encodeURIComponent("/console/lgpd")}`);
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
              <li>Este pedido de exclusão fica concluído.</li>
              <li>Isso é irreversível.</li>
            </ul>
            {error && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                {error}
              </p>
            )}
          </div>
        }
        confirmationValue={row.subjectAccountId}
        pending={pending}
      />
    </>
  );
}
