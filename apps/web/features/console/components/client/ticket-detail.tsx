"use client";

import React, { useState, useTransition } from "react";
import { Button, Select, StatusBadge, TextField } from "@albora/ui-web";
import type { SupportMessageRow, SupportPriority, SupportStatus, SupportTicketAdmin } from "@albora/db";
import type { TicketCustomerContext } from "@albora/application";
import {
  assignTicketAction, respondTicketAction, updateTicketPriorityAction, updateTicketStatusAction,
} from "@/features/console/actions";

const ROTULO_STATUS: Record<SupportStatus, string> = {
  open: "Aberto", pending: "Pendente", resolved: "Resolvido", closed: "Fechado",
};
const ROTULO_PRIORIDADE: Record<SupportPriority, string> = { p0: "P0", p1: "P1", p2: "P2" };

/**
 * Painel de contexto do cliente ao lado da thread (spec §8.1.6, decisão 3):
 * plano, eventos e pagamentos recentes — evita o operador abrir outra aba
 * no meio do atendimento. Sem "erros recentes": não existe tabela de erro
 * por conta/evento neste codebase (lacuna registrada no plano de T5); a
 * seção é omitida em vez de inventada.
 *
 * PII do titular chega já mascarada em `customerContext.maskedEmail` —
 * revelar é a ação de T3 (`RevealPiiButton`/`revealAccountPii`), separada e
 * auditada; esta tela nunca desmascara por conta própria.
 */
export function TicketDetail({
  ticket,
  messages,
  customerContext,
  staffOptions,
  canRespond = true,
  canManage = true,
}: {
  ticket: SupportTicketAdmin;
  messages: SupportMessageRow[];
  customerContext: TicketCustomerContext;
  staffOptions: { id: string; name: string }[];
  /** `false` quando o ator não tem `tickets.write` (ex.: financeiro, que só lê a fila). */
  canRespond?: boolean;
  /** `false` quando o ator não tem `tickets.write`/`tickets.assign`. */
  canManage?: boolean;
}) {
  const [body, setBody] = useState("");
  const [respondError, setRespondError] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 border-b border-linha pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="tipo-den-titulo m-0">{ticket.subject}</h2>
            <span className="tipo-den-corpo text-ink-3">{customerContext.maskedEmail}</span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Select
              label="Status"
              value={ticket.status}
              disabled={!canManage || pending}
              onChange={(e) => {
                const status = e.target.value as SupportStatus;
                startTransition(async () => {
                  const resultado = await updateTicketStatusAction(ticket.id, status);
                  setManageError(resultado.ok ? null : resultado.error);
                });
              }}
            >
              {Object.entries(ROTULO_STATUS).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Select>
            <Select
              label="Prioridade"
              value={ticket.priority}
              disabled={!canManage || pending}
              onChange={(e) => {
                const priority = e.target.value as SupportPriority;
                startTransition(async () => {
                  const resultado = await updateTicketPriorityAction(ticket.id, priority);
                  setManageError(resultado.ok ? null : resultado.error);
                });
              }}
            >
              {Object.entries(ROTULO_PRIORIDADE).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Select>
            <Select
              label="Atribuir a"
              value={ticket.assigneeStaffId ?? ""}
              disabled={!canManage || pending}
              onChange={(e) => {
                const assigneeStaffId = e.target.value || null;
                startTransition(async () => {
                  const resultado = await assignTicketAction(ticket.id, assigneeStaffId);
                  setManageError(resultado.ok ? null : resultado.error);
                });
              }}
            >
              <option value="">Sem responsável</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {manageError && (
          <p role="alert" className="tipo-caption m-0 text-critico">
            {manageError}
          </p>
        )}
      </header>

      <section className="flex flex-col gap-3">
        <h3 className="tipo-den-rotulo m-0 text-ink-3">Contexto do cliente</h3>
        <p className="tipo-den-corpo m-0">Plano: {customerContext.plan ?? "—"}</p>
        <p className="tipo-den-corpo m-0">Eventos: {customerContext.events.length}</p>
        <p className="tipo-den-corpo m-0">
          Pagamentos recentes:{" "}
          {customerContext.recentPayments.length > 0
            ? customerContext.recentPayments.map((p) => p.status).join(", ")
            : "nenhum"}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="tipo-den-rotulo m-0 text-ink-3">Conversa</h3>
        {messages.length === 0 ? (
          <p className="tipo-den-corpo m-0 text-ink-3">Nenhuma mensagem ainda.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {messages.map((m) => (
              <li key={m.id} className="rounded-token border border-linha p-3">
                <StatusBadge tone={m.authorKind === "operator" ? "positive" : "neutral"}>
                  {m.authorKind === "operator" ? "Equipe" : "Cliente"}
                </StatusBadge>
                <p className="tipo-den-corpo m-0 mt-2">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
        {canRespond && (
          <>
            <TextField label="Responder" value={body} onChange={(e) => setBody(e.target.value)} />
            {respondError && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                {respondError}
              </p>
            )}
            <Button
              type="button"
              disabled={pending || !body.trim()}
              onClick={() =>
                startTransition(async () => {
                  const resultado = await respondTicketAction(ticket.id, body);
                  if (resultado.ok) {
                    setBody("");
                    setRespondError(null);
                  } else {
                    setRespondError(resultado.error);
                  }
                })
              }
            >
              Enviar
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
