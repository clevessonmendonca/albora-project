import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { ConsentVersions } from "@/features/admin/components/client/consent-versions";

export const dynamic = "force-dynamic";

export default async function PaginaConsentimento({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Consentimento">
      <ConsentVersions eventoId={eventId} />
    </EventPageLayout>
  );
}
