import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { EventTeamPanel } from "@/features/admin/components/client/event-team-panel";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Equipe" nav="detail">
      {({ evento, canManageCoupleOnly }) => (
        <EventTeamPanel eventId={evento.eventoId} canManageTeam={canManageCoupleOnly} />
      )}
    </EventPageLayout>
  );
}
