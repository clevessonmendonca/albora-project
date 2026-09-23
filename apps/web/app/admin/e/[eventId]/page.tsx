import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { InicioDoEvento } from "@/features/admin/components/server/inicio-do-evento";

export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} allowFollowMode>
      {async (ctx) => <InicioDoEvento ctx={ctx} />}
    </EventPageLayout>
  );
}
