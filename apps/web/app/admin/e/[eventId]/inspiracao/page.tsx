import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { Inspiracao } from "@/features/admin/components/client/descobrir";

export const dynamic = "force-dynamic";

export default async function Pagina({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Inspiração" nav="primary">
      <Inspiracao eventId={eventId} />
    </EventPageLayout>
  );
}
