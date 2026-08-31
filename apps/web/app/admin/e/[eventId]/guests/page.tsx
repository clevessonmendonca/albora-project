import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { GuestFunnel } from "@/features/admin/components/client/guest-funnel";

export const dynamic = "force-dynamic";

export default async function PaginaConvidados({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Convidados">
      <GuestFunnel eventoId={eventId} />
    </EventPageLayout>
  );
}
