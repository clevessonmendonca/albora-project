"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@albora/ui-web";
import { approveImpersonationAction, denyImpersonationAction } from "@/features/console/actions";

export type PendingImpersonationRow = {
  id: string;
  requesterStaffId: string;
  targetAccountId: string;
  reason: string;
  createdAt: Date;
};

/**
 * "Direto da barra de contexto" (spec T10) — vive no `ConsoleShell`, visível
 * em qualquer tela do console para quem tem `impersonate.approve`, não
 * escondida numa página própria. Só renderizada para o dono (a página server
 * que a inclui já filtra por capacidade antes de buscar os pedidos); com
 * lista vazia, não renderiza nada — nem o título da seção.
 */
export function PendingImpersonationApprovals({ requests }: { requests: PendingImpersonationRow[] }) {
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (requests.length === 0) return null;

  function motivoDe(id: string): string {
    return motivos[id] ?? "";
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-token border border-linha bg-superficie p-4">
      <h2 className="tipo-den-rotulo m-0 text-ink-3">Pedidos de impersonação pendentes</h2>
      {requests.map((r) => (
        <div key={r.id} className="flex flex-col gap-2 border-b border-linha pb-3 last:border-none last:pb-0">
          <p className="tipo-den-corpo m-0">
            {`Ver como ${r.targetAccountId} — ${r.reason}`}
          </p>
          <TextField
            label="Motivo da aprovação"
            value={motivoDe(r.id)}
            onChange={(e) => setMotivos((m) => ({ ...m, [r.id]: e.target.value }))}
          />
          {erros[r.id] && (
            <p role="alert" className="tipo-caption m-0 text-critico">
              {erros[r.id]}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={pending || !motivoDe(r.id).trim()}
              onClick={() =>
                startTransition(async () => {
                  const resultado = await approveImpersonationAction(r.id, motivoDe(r.id));
                  if (resultado.ok) router.refresh();
                  else setErros((e) => ({ ...e, [r.id]: resultado.error }));
                })
              }
            >
              Aprovar
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending || !motivoDe(r.id).trim()}
              onClick={() =>
                startTransition(async () => {
                  const resultado = await denyImpersonationAction(r.id, motivoDe(r.id));
                  if (resultado.ok) router.refresh();
                  else setErros((e) => ({ ...e, [r.id]: resultado.error }));
                })
              }
            >
              Negar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
