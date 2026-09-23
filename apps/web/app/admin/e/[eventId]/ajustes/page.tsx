import React from "react";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { EventControls } from "@/features/admin/components/client/event-controls";
import { EventTeamPanel } from "@/features/admin/components/client/event-team-panel";
import { ConsentVersions } from "@/features/admin/components/client/consent-versions";
import { EncerrarEvento } from "@/features/admin/components/client/encerrar-evento";

export const dynamic = "force-dynamic";

export default async function PaginaAjustes({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Ajustes">
      {({ evento, canManageCoupleOnly }) => (
        <div className="flex flex-col gap-5">
          <EventTeamPanel eventId={evento.eventoId} canManageTeam={canManageCoupleOnly} />

          <EventControls
            eventId={evento.eventoId}
            plan={evento.plan}
            initial={evento.moderacao}
            initialInteractionOpensAt={evento.interacaoAbreEm?.toISOString() ?? null}
            initialStatus={evento.status}
            canManageCoupleOnly={canManageCoupleOnly}
            modo="regras"
          />

          <ConsentVersions eventoId={eventId} />

          {canManageCoupleOnly && (
            <EncerrarEvento eventId={evento.eventoId} status={evento.status} />
          )}
        </div>
      )}
    </EventPageLayout>
  );
}
