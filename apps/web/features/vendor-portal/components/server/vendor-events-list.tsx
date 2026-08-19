import React from "react";
import type { VendorEventSummary } from "@albora/db";
import { adminEventDisplayName } from "@/features/admin/lib/event-display-name";

/**
 * B1-mínimo é leitura: nenhum item da lista linka para `/admin/e/{id}`.
 * Entrar num evento específico ainda exige `roleForAccountOnEvent` (spec §2)
 * — hoje só populado quando o fornecedor cria o evento pelo wizard (V2b,
 * fora deste corte). Linkar aqui produziria 404 para o membro do portal em
 * qualquer evento que ele não tenha sido convidado individualmente.
 */
export function VendorEventsList({ eventos }: { eventos: VendorEventSummary[] }) {
  if (eventos.length === 0) {
    return (
      <section className="rounded-superficie border border-linha bg-superficie p-6 text-center">
        <p className="m-0 text-[0.9375rem] text-ink">Nenhum evento ainda</p>
        <p className="m-0 mt-2 text-[0.8125rem] leading-relaxed text-ink-3">
          Os eventos vinculados a este fornecedor aparecem aqui.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-superficie border border-linha bg-superficie p-6">
      <p className="m-0 mb-3 text-[0.8125rem] uppercase tracking-rotulo text-ink-3">
        {eventos.length === 1 ? "1 evento" : `${eventos.length} eventos`}
      </p>
      <ul className="m-0 flex list-none flex-col gap-0 p-0">
        {eventos.map((evento) => (
          <li key={evento.id} className="border-b border-linha py-4 last:border-b-0">
            <p className="m-0 font-titulo text-ink">{adminEventDisplayName(evento)}</p>
            <p className="m-0 mt-1 text-[0.85rem] text-ink-3">
              {evento.startsAt.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
              {" · "}
              {evento.expectedGuests} convidados esperados
              {evento.isDemo ? " · demo" : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
