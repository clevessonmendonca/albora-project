import { getEvent } from "@albora/application";
import { notFound, redirect } from "next/navigation";
import React from "react";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";
import { ROTULO_STATUS_EVENTO, TOM_STATUS_EVENTO } from "@/features/console/components/client/events-table";
import { EventoCabecalho, PainelDeDetalheEvento } from "@/features/console/components/server/eventos-cabecalho";

export const dynamic = "force-dynamic";

function formatarData(data: Date): string {
  return new Date(data).toLocaleDateString("pt-BR");
}

/** `null` é "não dá pra saber" (sem `expected_guests`); nunca vira "0%". */
function formatarH1(h1: number | null): string {
  return h1 === null ? "—" : `${Math.round(h1 * 100)}%`;
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { id } = await params;
  const evento = await getEvent(
    { pool: getPool(), aggregatorPool: getAggregatorPool() },
    { actor, reason: `abrir /console/events/${id}`, eventId: id },
  );
  if (!evento) notFound();

  return (
    <>
      <EventoCabecalho
        inicial={(evento.title ?? evento.id).charAt(0).toUpperCase()}
        title={evento.title ?? evento.id}
        subtitle={`H1: ${formatarH1(evento.h1)}`}
        id={evento.id}
        status={{ tone: TOM_STATUS_EVENTO[evento.status], label: ROTULO_STATUS_EVENTO[evento.status] }}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PainelDeDetalheEvento
          titulo="Identidade"
          secoes={[
            { key: "anfitriao", label: "Anfitrião", content: <p className="m-0">{evento.hostMaskedEmail}</p>, emptyLabel: "—" },
            {
              key: "fornecedor",
              label: "Fornecedor",
              content: evento.vendorName ? <p className="m-0">{evento.vendorName}</p> : null,
              emptyLabel: "Sem fornecedor — evento direto",
            },
            { key: "data", label: "Data", content: <p className="m-0">{formatarData(evento.startsAt)}</p>, emptyLabel: "—" },
            {
              key: "convidados",
              label: "Convidados esperados",
              content: <p className="m-0 tabular-nums">{evento.expectedGuests}</p>,
              emptyLabel: "—",
            },
          ]}
        />
        <PainelDeDetalheEvento
          titulo="Funil"
          secoes={
            evento.degraus.length > 0
              ? evento.degraus.map((d) => ({
                  key: d.etapa,
                  label: d.etapa,
                  content: <p className="m-0 tabular-nums">{d.sessoes} sessões</p>,
                  emptyLabel: "—",
                }))
              : [
                  {
                    key: "vazio",
                    label: "Sessões",
                    content: null,
                    emptyLabel: "Nenhuma sessão registrada ainda",
                  },
                ]
          }
        />
        <PainelDeDetalheEvento
          titulo="Consentimento"
          secoes={[
            {
              key: "consentimentos",
              label: "Aceites por versão",
              content:
                evento.consentsByVersion.length > 0 ? (
                  <ul className="m-0 list-none p-0">
                    {evento.consentsByVersion.map((c) => (
                      <li key={c.versao}>
                        {c.versao}: {c.aceites} aceite(s)
                      </li>
                    ))}
                  </ul>
                ) : null,
              emptyLabel: "Nenhum consentimento registrado",
            },
          ]}
        />
      </div>
    </>
  );
}
