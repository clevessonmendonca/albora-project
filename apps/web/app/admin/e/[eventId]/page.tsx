import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { EventControls } from "@/features/admin/components/client/event-controls";
import { LiveSummary } from "@/features/admin/components/client/live-summary";

export const dynamic = "force-dynamic";

export default async function Pagina({
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
            eventoId={evento.eventoId}
            slug={evento.slug}
            inicial={evento.moderacao}
            interacaoAbreEmInicial={evento.interacaoAbreEm?.toISOString() ?? null}
          />
        </>
      )}
    </EventPageLayout>
  );
}
