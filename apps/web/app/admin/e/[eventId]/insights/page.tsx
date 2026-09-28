import React from "react";
import Link from "next/link";
import { lerMetricasAoVivo, withEvent } from "@albora/db";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { EventInsights } from "@/features/admin/components/client/event-insights";
import {
  botaoDoPainel,
  CabecalhoDeCartao,
  Cartao,
  FaixaDeDestaque,
  IntroDaPagina,
} from "@/features/admin/components/server/kit-do-painel";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PaginaInsights({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const metricas = await withEvent(getPool(), eventId, (c) => lerMetricasAoVivo(c, eventId));

  // Sem foto não há o que medir: gráfico de zero não informa, só ocupa a tela
  // com a forma de um dado que não existe (protótipo §5.6).
  if (metricas.totalFotos === 0) {
    return (
      <EventPageLayout eventId={eventId}>
        <IntroDaPagina
          eyebrow="O que aconteceu"
          titulo="Insights"
          subtitulo="Quantas pessoas participaram e em que momento da festa."
        />
        <Cartao className="mx-auto max-w-[44rem] text-center">
          <CabecalhoDeCartao titulo="Tudo começa com um convite" />
          <p className="m-0 mx-auto max-w-[46ch] text-sm leading-relaxed text-ink-2">
            Os números aparecem aqui conforme as fotos chegam. Enquanto ninguém enviou a primeira,
            não há o que contar — e o que mais muda essa conta é o convite chegar às pessoas.
          </p>
          <Link
            href={`/admin/e/${eventId}/qrcode`}
            className={`${botaoDoPainel({ variant: "primary" })} mt-6`}
          >
            Compartilhar convite
          </Link>
        </Cartao>
      </EventPageLayout>
    );
  }

  return (
    <EventPageLayout eventId={eventId}>
      <IntroDaPagina
        eyebrow="O que aconteceu"
        titulo="Insights"
        subtitulo="Quantas pessoas participaram e em que momento da festa."
      />
      <FaixaDeDestaque
        eyebrow="Seu evento em números"
        titulo="A festa vista de cima."
        descricao="Participação por momento, fotos recebidas e quanto do álbum já está pronto para exibir."
      />
      <EventInsights eventoId={eventId} />
    </EventPageLayout>
  );
}
