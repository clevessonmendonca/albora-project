import React from "react";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { EventInsights } from "@/features/admin/components/client/event-insights";
import {
  FaixaDeDestaque,
  IntroDaPagina,
} from "@/features/admin/components/server/kit-do-painel";

export const dynamic = "force-dynamic";

export default async function PaginaInsights({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

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
