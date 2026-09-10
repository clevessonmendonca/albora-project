"use client";

import React, { useState, useTransition } from "react";
import { Button, Select, TextField } from "@albora/ui-web";
import { createDsarRequestAction } from "@/features/console/actions";
import type { DsarKind } from "@albora/db";
import { CabecalhoDePainel, Painel } from "@/features/console/components/server/console-primitivos";

const ROTULO_KIND: Record<DsarKind, string> = {
  access: "Acesso",
  portability: "Portabilidade",
  rectification: "Retificação",
  deletion: "Exclusão",
};

/**
 * Registra um novo pedido de titular. `legalDueAt` não tem valor padrão de
 * propósito (RULING da task 7) — o formulário não sugere data nenhuma, e o
 * botão só habilita com prazo, conta e motivo preenchidos.
 */
export function DsarForm() {
  const [kind, setKind] = useState<DsarKind>("access");
  const [subjectAccountId, setSubjectAccountId] = useState("");
  const [legalDueAt, setLegalDueAt] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const podeRegistrar = subjectAccountId.trim() !== "" && legalDueAt !== "" && reason.trim() !== "";

  return (
    <Painel className="mb-6">
      <CabecalhoDePainel titulo="Novo pedido" nota="acesso, portabilidade, retificação ou exclusão" />
      <div className="flex flex-col gap-3 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Tipo" value={kind} onChange={(e) => setKind(e.target.value as DsarKind)}>
            {Object.entries(ROTULO_KIND).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Select>
          <TextField
            label="Conta do titular (id)"
            value={subjectAccountId}
            onChange={(e) => setSubjectAccountId(e.target.value)}
            placeholder="uuid da conta"
          />
          <TextField label="Prazo legal" type="date" value={legalDueAt} onChange={(e) => setLegalDueAt(e.target.value)} />
          <TextField
            label="Motivo"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="ex.: pedido recebido por e-mail em 05/09"
          />
        </div>
        {error && (
          <p role="alert" className="tipo-caption m-0 text-critico">
            {error}
          </p>
        )}
        <Button
          type="button"
          disabled={pending || !podeRegistrar}
          onClick={() =>
            startTransition(async () => {
              const resultado = await createDsarRequestAction(kind, subjectAccountId, legalDueAt, reason);
              if (resultado.ok) {
                setSubjectAccountId("");
                setLegalDueAt("");
                setReason("");
                setError(null);
              } else {
                setError(resultado.error);
              }
            })
          }
        >
          Registrar pedido
        </Button>
      </div>
    </Painel>
  );
}
