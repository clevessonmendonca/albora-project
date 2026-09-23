import React from "react";
import Link from "next/link";
import { EditorialTabs } from "@albora/ui-web";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { GuestFunnel } from "@/features/admin/components/client/guest-funnel";
import { EventInsights } from "@/features/admin/components/client/event-insights";
import { ABAS_CONVIDADOS, abaConvidadosAtiva } from "@/features/admin/lib/abas-convidados";

export const dynamic = "force-dynamic";

export default async function PaginaConvidados({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { eventId } = await params;
  const { aba } = await searchParams;
  const ativa = abaConvidadosAtiva(aba);
  const abaAtual = ABAS_CONVIDADOS.find((a) => a.id === ativa);

  return (
    <EventPageLayout eventId={eventId} section="Convidados">
      <div className="flex flex-col gap-5">
        <EditorialTabs
          items={ABAS_CONVIDADOS.map((a) => ({ label: a.rotulo, suffix: a.suffix }))}
          active={abaAtual?.suffix ?? ""}
          base={`/admin/e/${eventId}/guests`}
          linkComponent={Link}
        />

        <GuestFunnel eventoId={eventId} faceta={ativa} />

        {ativa === "participacao" && <EventInsights eventoId={eventId} />}
      </div>
    </EventPageLayout>
  );
}
