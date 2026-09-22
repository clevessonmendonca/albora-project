import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { EventHub } from "@/features/admin/components/client/event-hub";

export const dynamic = "force-dynamic";

export default async function EventoPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Evento" nav="primary">
      <EventHub eventId={eventId} />
    </EventPageLayout>
  );
}
