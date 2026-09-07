import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { PreEventChecklist } from "@/features/admin/components/client/pre-event-checklist";

export const dynamic = "force-dynamic";

export default async function PreEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Pré-evento">
      {({ checklistStorageKey }) => (
        <PreEventChecklist eventId={eventId} storageKey={checklistStorageKey} />
      )}
    </EventPageLayout>
  );
}
