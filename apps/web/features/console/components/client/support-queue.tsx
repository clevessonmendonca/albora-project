"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StatusBadge } from "@albora/ui-web";
import type { SupportTicketAdmin } from "@albora/db";

/**
 * Contagem regressiva por linha (spec §8.1.6, decisão 2). Ao estourar, NÃO
 * pisca — a cor (`--color-critico-superficie`) e o texto ("Estourado há…")
 * já dizem o que queima; uma fila com seis estouros piscando é inutilizável,
 * e `animate-pulse` também escaparia do kill-switch de reduced-motion.
 */
function tempoRestante(slaDueAt: Date | null, agora: Date): { texto: string; estourado: boolean } {
  if (!slaDueAt) return { texto: "sem SLA", estourado: false };
  const diffMs = slaDueAt.getTime() - agora.getTime();
  if (diffMs <= 0) {
    const minutos = Math.round(Math.abs(diffMs) / 60_000);
    return { texto: `Estourado há ${minutos}min`, estourado: true };
  }
  const minutos = Math.round(diffMs / 60_000);
  return { texto: minutos < 60 ? `${minutos}min restantes` : `${Math.round(minutos / 60)}h restantes`, estourado: false };
}

export function SupportQueue({ rows, selectedId, now }: { rows: SupportTicketAdmin[]; selectedId: string | null; now: Date }) {
  const searchParams = useSearchParams();

  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {rows.map((ticket) => {
        const sla = tempoRestante(ticket.slaDueAt, now);
        const params = new URLSearchParams(searchParams);
        params.set("ticket", ticket.id);
        return (
          <li key={ticket.id}>
            <Link
              href={`/console/support?${params.toString()}`}
              aria-current={ticket.id === selectedId ? "true" : undefined}
              className={[
                "flex min-h-11 flex-col gap-0.5 rounded-token border px-3 py-2 no-underline transition-colors duration-[var(--tempo)] ease-[var(--curva)]",
                ticket.id === selectedId ? "border-acento-texto bg-acento-superficie" : "border-linha hover:bg-superficie-alta",
                sla.estourado ? "bg-critico-superficie" : "",
              ].join(" ")}
            >
              <span className="tipo-den-corpo text-ink">{ticket.subject}</span>
              <div className="flex items-center gap-2">
                <StatusBadge tone={sla.estourado ? "critico" : "neutral"}>{sla.texto}</StatusBadge>
                <span className="tipo-den-rotulo text-ink-3">{ticket.priority.toUpperCase()}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
