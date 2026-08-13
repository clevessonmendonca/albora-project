import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { ModerationPage } from "@/features/admin/components/client/moderation-page";

export const dynamic = "force-dynamic";

export default async function PaginaModeracao({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Moderação">
      <ModerationPage eventoId={eventId} />
    </EventPageLayout>
  );
}
