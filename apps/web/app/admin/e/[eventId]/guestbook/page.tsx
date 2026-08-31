import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { GuestbookEditor } from "@/features/admin/components/client/guestbook-editor";

export const dynamic = "force-dynamic";

export default async function GuestbookPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Recado">
      {({ evento }) => <GuestbookEditor eventId={eventId} packId={evento.packId} />}
    </EventPageLayout>
  );
}
