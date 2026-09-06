import React from "react";
import { redirect } from "next/navigation";
import { getTicketDetail, listActiveStaff, listTicketQueue } from "@albora/application";
import { hasCapability } from "@albora/core";
import { ConsoleEmptyState, PageHeader } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";
import { SupportQueue } from "@/features/console/components/client/support-queue";
import { TicketDetail } from "@/features/console/components/client/ticket-detail";

export const dynamic = "force-dynamic";

/**
 * Mesa de suporte (spec §8.1.6) — duas zonas, sem navegar para fora: fila
 * ordenada pelo servidor por `sla_due_at` mais próximo do estouro (T5,
 * `listTicketQueue`), ticket selecionado com thread + contexto do cliente
 * ao lado. Selecionar um ticket troca só o `?ticket=` da própria página.
 */
export default async function SupportPage({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { ticket: ticketIdSelecionado } = await searchParams;
  const deps = { pool: getPool(), aggregatorPool: getAggregatorPool() };
  const reason = "abrir /console/support";

  const canRespond = hasCapability(actor.roles, "tickets.write");
  const canManage = hasCapability(actor.roles, "tickets.write") && hasCapability(actor.roles, "tickets.assign");

  // Só busca as opções do dropdown "Atribuir a" para quem pode atribuir —
  // `listActiveStaff` nega quem não tem `tickets.assign`, e ninguém mais
  // usa a lista (o dropdown some quando `canManage` é falso).
  const [{ rows }, staffOptions] = await Promise.all([
    listTicketQueue(deps, { actor, reason, statuses: ["open", "pending"], limit: 100 }),
    canManage ? listActiveStaff({ pool: deps.pool }, { actor }) : Promise.resolve([]),
  ]);

  const idAtivo = ticketIdSelecionado ?? rows[0]?.id ?? null;
  const detalhe = idAtivo ? await getTicketDetail(deps, { actor, reason, ticketId: idAtivo }) : null;

  return (
    <>
      <PageHeader title="Suporte" description="Fila ordenada pelo SLA mais próximo do estouro." />
      {rows.length === 0 ? (
        <ConsoleEmptyState
          title="Nenhum ticket aberto"
          description="Tickets abertos ou pendentes aparecem aqui, com o de SLA mais urgente no topo."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr]">
          <SupportQueue rows={rows} selectedId={idAtivo} now={new Date()} />
          {detalhe ? (
            <TicketDetail
              ticket={detalhe.ticket}
              messages={detalhe.messages}
              customerContext={detalhe.customerContext}
              staffOptions={staffOptions}
              canRespond={canRespond}
              canManage={canManage}
            />
          ) : (
            <ConsoleEmptyState title="Selecione um ticket" description="Escolha um item da fila para ver a conversa." />
          )}
        </div>
      )}
    </>
  );
}
