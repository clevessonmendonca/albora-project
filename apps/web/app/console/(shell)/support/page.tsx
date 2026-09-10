import React from "react";
import { redirect } from "next/navigation";
import { getTicketDetail, listActiveStaff, listTicketQueue } from "@albora/application";
import { hasCapability } from "@albora/core";
import { ConsoleEmptyState } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";
import { SupportQueue } from "@/features/console/components/client/support-queue";
import { TicketDetail } from "@/features/console/components/client/ticket-detail";
import { formatarNumero } from "@/features/console/components/server/overview-sections";
import { CabecalhoDePainel, Painel, RotuloSerif, TituloDaTela } from "@/features/console/components/server/console-primitivos";

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

  const now = new Date();
  const estourados = rows.filter((r) => r.slaDueAt !== null && r.slaDueAt.getTime() <= now.getTime()).length;

  return (
    <>
      <TituloDaTela titulo="Suporte" descricao="Fila ordenada pelo SLA mais próximo do estouro." />

      {rows.length === 0 ? (
        <Painel>
          <ConsoleEmptyState
            title="Nenhum ticket aberto"
            description="Tickets abertos ou pendentes aparecem aqui, com o de SLA mais urgente no topo."
          />
        </Painel>
      ) : (
        <>
          <Painel className="mb-6 px-5 py-4">
            <dl className="m-0 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <dt className="m-0">
                  <RotuloSerif>Abertos</RotuloSerif>
                </dt>
                <dd className="tipo-den-metrica m-0 text-[1.6rem] font-medium text-ink">{formatarNumero(rows.length)}</dd>
              </div>
              <div className="flex flex-col gap-1 border-l border-linha pl-4">
                <dt className="m-0">
                  <RotuloSerif>SLA estourado</RotuloSerif>
                </dt>
                <dd className={`tipo-den-metrica m-0 text-[1.6rem] font-medium ${estourados > 0 ? "text-critico" : "text-ink"}`}>
                  {formatarNumero(estourados)}
                </dd>
              </div>
            </dl>
          </Painel>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr]">
            <Painel className="overflow-hidden">
              <CabecalhoDePainel titulo="Fila" nota={`${formatarNumero(rows.length)} ticket(s)`} />
              <div className="p-2">
                <SupportQueue rows={rows} selectedId={idAtivo} now={now} />
              </div>
            </Painel>

            <Painel className="p-6">
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
            </Painel>
          </div>
        </>
      )}
    </>
  );
}
