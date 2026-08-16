import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { EventControls } from "@/features/admin/components/client/event-controls";
import { LiveSummary } from "@/features/admin/components/client/live-summary";

export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId}>
      {({ evento }) => (
        <>
          <LiveSummary eventoId={eventId} />
          <EventControls
            eventId={evento.eventoId}
            slug={evento.slug}
            plan={evento.plan}
            initial={evento.moderacao}
            initialInteractionOpensAt={evento.interacaoAbreEm?.toISOString() ?? null}
          />
        </>
      )}
    </EventPageLayout>
  );
}
