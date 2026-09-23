import React from "react";
import Link from "next/link";
import { buttonClasses } from "@albora/ui-web";
import { AdminCard, AdminSection } from "@/features/admin/components/server/admin-shell";
import { EventMusic } from "@/features/admin/components/client/event-music";
import type { AdminEventPageContext } from "@/features/admin/data/load-event-page";

type Peca = {
  id: string;
  titulo: string;
  oQueFaz: string;
  estado: string;
  acao: string;
  href: string;
};

function pecas(base: string, ctx: AdminEventPageContext): Peca[] {
  const temCapa = Boolean(ctx.evento.coverImageKey);
  const temIdentidade = Object.keys(ctx.evento.identityTokens).length > 0;

  return [
    {
      id: "identidade",
      titulo: "Identidade e capa",
      oQueFaz: "A cor e a imagem que o convidado vê ao escanear o QR.",
      estado:
        temCapa && temIdentidade
          ? "Capa e cor definidas."
          : temCapa
            ? "Capa definida. A cor ainda é a padrão."
            : temIdentidade
              ? "Cor definida. Falta a capa."
              : "Ainda sem capa e sem cor própria.",
      acao: temCapa || temIdentidade ? "Ajustar" : "Definir",
      href: `${base}/identity`,
    },
    {
      id: "missoes",
      titulo: "Missões",
      oQueFaz: "Pedidos curtos de foto que aparecem para o convidado durante a festa.",
      estado:
        ctx.missoes === 0
          ? "Nenhuma missão escolhida ainda."
          : `${ctx.missoes} ${ctx.missoes === 1 ? "missão escolhida" : "missões escolhidas"}.`,
      acao: ctx.missoes === 0 ? "Escolher" : "Ajustar",
      href: `${base}/missions`,
    },
    {
      id: "recado",
      titulo: "Recado",
      oQueFaz: "Uma mensagem de vocês, em texto ou áudio, para quem chega.",
      estado: "Escreva ou grave quando quiser.",
      acao: "Escrever",
      href: `${base}/guestbook`,
    },
  ];
}

export function HubExperiencia({ ctx, origin }: { ctx: AdminEventPageContext; origin: string }) {
  const base = `/admin/e/${ctx.eventoId}`;

  return (
    <div className="flex flex-col gap-5">
      <AdminCard variant="highlight">
        <h2 className="tipo-subtitle m-0 mb-2 text-ink">O que o convidado vê</h2>
        <p className="tipo-body m-0 mb-5 max-w-[52ch] text-ink-2">
          Tudo aqui muda a experiência de quem está na festa. Olhe com os olhos dele antes de
          decidir.
        </p>
        <a
          href={`${origin}/e/${ctx.evento.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses({ variant: "primary" })}
        >
          Ver como convidado
        </a>
      </AdminCard>

      {pecas(base, ctx).map((peca) => (
        <AdminSection key={peca.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="tipo-subtitle m-0 text-ink">{peca.titulo}</h3>
              <p className="tipo-body m-0 mt-2 max-w-[48ch] text-ink-2">{peca.oQueFaz}</p>
              <p className="tipo-caption m-0 mt-2 text-ink-3">{peca.estado}</p>
            </div>
            <Link
              href={peca.href}
              aria-label={`${peca.acao} — ${peca.titulo}`}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              {peca.acao}
            </Link>
          </div>
        </AdminSection>
      ))}

      <EventMusic eventId={ctx.eventoId} />

      <AdminSection>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="tipo-subtitle m-0 text-ink">Telão</h3>
            <p className="tipo-body m-0 mt-2 max-w-[48ch] text-ink-2">
              Uma tela no salão mostrando as fotos conforme elas chegam. Abra este link no
              computador ligado ao projetor e deixe em tela cheia.
            </p>
          </div>
          <a
            href={`${origin}/wall-display`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            Abrir o telão
          </a>
        </div>
      </AdminSection>
    </div>
  );
}
