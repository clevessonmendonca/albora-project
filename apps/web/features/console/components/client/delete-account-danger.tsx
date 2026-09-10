"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, TextField } from "@albora/ui-web";
import { createDsarRequestAction } from "@/features/console/actions";

/**
 * "Excluir conta" nunca apaga direto (RULING: exclusão de conta sempre abre
 * um pedido DSAR). Este botão registra um pedido `kind = "deletion"` — a
 * mesma mutação que `DsarForm` chama, só que com `subjectAccountId` fixo
 * nesta conta — e nada no banco muda além dessa linha. A purga de verdade
 * (`deleteAccountAction`) só roda depois, na tela `/console/lgpd`, contra
 * este pedido aberto.
 *
 * A fricção de digitar o id de volta continua: abrir um pedido de exclusão
 * é o primeiro passo de um caminho irreversível, mesmo que este passo não
 * seja. `legalDueAt` não tem sugestão nem default (mesma regra de
 * `DsarForm`) — o operador informa o prazo.
 */
export function DeleteAccountDanger({ accountId, maskedEmail }: { accountId: string; maskedEmail: string }) {
  const [open, setOpen] = useState(false);
  const [digitado, setDigitado] = useState("");
  const [legalDueAt, setLegalDueAt] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const podeConfirmar = digitado === accountId && legalDueAt !== "" && reason.trim() !== "";

  function fechar() {
    setOpen(false);
    setDigitado("");
    setLegalDueAt("");
    setReason("");
    setError(null);
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Excluir conta
      </Button>
      <Dialog open={open} onClose={fechar} aria-labelledby="abrir-pedido-exclusao-titulo">
        <div className="elev-2 mx-auto flex w-full max-w-[30rem] flex-col gap-4 rounded-superficie border border-critico bg-superficie p-6">
          <h2 id="abrir-pedido-exclusao-titulo" className="tipo-den-titulo m-0 text-critico">
            Abrir pedido de exclusão desta conta?
          </h2>
          <div className="tipo-den-corpo text-ink-2">
            <ul className="m-0 list-disc pl-5">
              <li>Isso registra um pedido DSAR de exclusão — nada é apagado agora.</li>
              <li>A exclusão de verdade só roda depois, em Console → LGPD, contra este pedido.</li>
              <li>Conta: {maskedEmail}.</li>
            </ul>
            {error && (
              <p role="alert" className="tipo-caption m-0 mt-2 text-critico">
                {error}
              </p>
            )}
          </div>
          <TextField
            label={`Digite "${accountId}" para confirmar`}
            value={digitado}
            onChange={(e) => setDigitado(e.target.value)}
            disabled={pending}
          />
          <TextField
            label="Prazo legal"
            type="date"
            value={legalDueAt}
            onChange={(e) => setLegalDueAt(e.target.value)}
            disabled={pending}
          />
          <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} disabled={pending} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={fechar} disabled={pending}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={pending || !podeConfirmar}
              onClick={() =>
                startTransition(async () => {
                  const resultado = await createDsarRequestAction("deletion", accountId, legalDueAt, reason);
                  if (resultado.ok) {
                    router.push("/console/lgpd");
                  } else {
                    setError(resultado.error);
                  }
                })
              }
            >
              {pending ? "Abrindo…" : "Abrir pedido"}
            </Button>
          </div>
        </div>
      </Dialog>
      <p className="tipo-caption m-0 mt-2 text-ink-3">
        Conta: {maskedEmail} — digite o id ({accountId}) para confirmar.
      </p>
    </>
  );
}
