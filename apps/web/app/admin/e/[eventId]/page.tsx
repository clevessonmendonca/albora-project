import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { EventHome } from "@/features/admin/components/client/event-home";

export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} allowFollowMode nav="primary">
      {(ctx) => <EventHome ctx={ctx} eventId={eventId} />}
    </EventPageLayout>
  );
}
