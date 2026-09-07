"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, StatusBadge, TextField } from "@albora/ui-web";
import { requestImpersonationAction, startImpersonationAction } from "@/features/console/actions";

/**
 * Status do pedido mais recente do OPERADOR ATUAL para ESTA conta —
 * `getLatestImpersonationRequestForRequesterAndAccount` (T10) na página do
 * servidor. `null`/`undefined` (ou `ended`/`denied`) significa "sem pedido
 * em andamento", que é o único caso em que o formulário reaparece.
 */
export type ExistingImpersonationRequest = {
  id: string;
  status: "pending" | "approved" | "active" | "ended" | "denied" | "expired";
  expiresAt: Date | null;
};

/**
 * `approved` não vira `expired` sozinho no banco — `startImpersonationRequestOnClient`
 * (T9) reavalia `expires_at > now()` a cada tentativa de início, nunca contra
 * um status pré-calculado. Esta função espelha a MESMA regra do lado do
 * cliente, só pra decidir o que mostrar; quem decide de verdade continua
 * sendo o comando no servidor.
 */
function pedidoExpirado(req: ExistingImpersonationRequest): boolean {
  return req.status === "approved" && req.expiresAt !== null && req.expiresAt.getTime() <= Date.now();
}

export function ImpersonationRequestDrawer({
  accountId,
  existingRequest = null,
}: {
  accountId: string;
  existingRequest?: ExistingImpersonationRequest | null;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const expirado = existingRequest !== null && pedidoExpirado(existingRequest);
  const aguardandoAprovacao = enviado || existingRequest?.status === "pending";
  const sessaoAtiva = existingRequest?.status === "active";
  const podeIniciar = existingRequest !== null && existingRequest.status === "approved" && !expirado && !enviado;
  const podeAbrirFormulario = !aguardandoAprovacao && !sessaoAtiva && !podeIniciar;

  function fecharDialogo() {
    setOpen(false);
    setErro(null);
  }

  function enviarPedido() {
    startTransition(async () => {
      const resultado = await requestImpersonationAction(accountId, reason);
      if (resultado.ok) {
        setEnviado(true);
        setOpen(false);
      } else {
        setErro(resultado.error);
      }
    });
  }

  function iniciarSessao() {
    if (!existingRequest) return;
    startTransition(async () => {
      const resultado = await startImpersonationAction(existingRequest.id);
      if (resultado.ok) {
        router.refresh();
      } else {
        setErro(resultado.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {aguardandoAprovacao && <StatusBadge tone="neutral">Pedido enviado — aguardando aprovação do dono</StatusBadge>}
      {!aguardandoAprovacao && sessaoAtiva && <StatusBadge tone="positive">Sessão ativa</StatusBadge>}
      {!aguardandoAprovacao && expirado && <StatusBadge tone="atencao">Pedido expirado</StatusBadge>}

      {podeIniciar && existingRequest && (
        <Button type="button" disabled={pending} onClick={iniciarSessao}>
          Iniciar sessão
        </Button>
      )}

      {podeAbrirFormulario && (
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          {expirado ? "Pedir novamente" : "Ver como"}
        </Button>
      )}

      {erro && (
        <p role="alert" className="tipo-caption m-0 text-critico">
          {erro}
        </p>
      )}

      <Dialog open={open} onClose={fecharDialogo} aria-labelledby="impersonation-request-title">
        <div className="elev-2 mx-auto flex w-full max-w-[28rem] flex-col gap-4 rounded-superficie border border-linha bg-superficie p-6">
          <h2 id="impersonation-request-title" className="tipo-den-titulo m-0">
            Ver como este cliente
          </h2>
          <p className="tipo-den-corpo m-0 text-ink-2">
            Isso cria um pedido — o dono precisa aprovar antes que a janela abra.
          </p>
          <TextField
            label="Motivo"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="ex.: cliente pediu ajuda visual"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={fecharDialogo} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" disabled={pending || !reason.trim()} onClick={enviarPedido}>
              Enviar pedido
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
