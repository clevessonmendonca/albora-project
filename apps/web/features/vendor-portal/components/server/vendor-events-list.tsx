import React from "react";
import type { VendorEventSummary } from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";
import { adminEventDisplayName } from "@/features/admin/lib/event-display-name";

type PackGroup = {
  packId: string;
  label: string;
  eventos: VendorEventSummary[];
};

function capitalizado(texto: string): string {
  return texto.length === 0 ? texto : texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Rótulo do grupo vem do vocabulário do pack (`evento.nome`) via
 * `resolvePackText` — nunca string de domínio hardcodada aqui. Pack fora do
 * catálogo cai para o próprio `packId`, o mesmo atalho que
 * `adminEventDisplayName` usa para `slug` quando falta título.
 */
function packGroupLabel(packId: string): string {
  const pack = PACKS[packId];
  return capitalizado(pack ? resolvePackText(pack, "evento.nome") : packId);
}

/** Preserva a ordem de chegada: `eventosDoFornecedor` já devolve `startsAt DESC`. */
function agruparPorPack(eventos: VendorEventSummary[]): PackGroup[] {
  const ordem: string[] = [];
  const porPack = new Map<string, VendorEventSummary[]>();
  for (const evento of eventos) {
    if (!porPack.has(evento.packId)) {
      ordem.push(evento.packId);
      porPack.set(evento.packId, []);
    }
    porPack.get(evento.packId)!.push(evento);
  }
  return ordem.map((packId) => ({
    packId,
    label: packGroupLabel(packId),
    eventos: porPack.get(packId)!,
  }));
}

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

  const grupos = agruparPorPack(eventos);

  return (
    <section className="rounded-superficie border border-linha bg-superficie p-6">
      <p className="m-0 mb-4 text-[0.8125rem] uppercase tracking-rotulo text-ink-3">
        {eventos.length === 1 ? "1 evento" : `${eventos.length} eventos`}
      </p>
      <div className="flex flex-col gap-6">
        {grupos.map((grupo) => (
          <div key={grupo.packId}>
            <p className="m-0 mb-2 font-titulo text-[0.85rem] text-ink-2">
              {grupo.label} ({grupo.eventos.length})
            </p>
            <ul className="m-0 flex list-none flex-col gap-0 p-0">
              {grupo.eventos.map((evento) => (
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
          </div>
        ))}
      </div>
    </section>
  );
}
