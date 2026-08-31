import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { EventInsights } from "@/features/admin/components/client/event-insights";

export const dynamic = "force-dynamic";

export default async function PaginaInsights({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Insights">
      <EventInsights eventoId={eventId} />
    </EventPageLayout>
  );
}
