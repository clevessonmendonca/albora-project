import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { IdentityEditor } from "@/features/admin/components/client/identity-editor";

export const dynamic = "force-dynamic";

export default async function IdentityPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Identidade">
      {({ evento }) => (
        <IdentityEditor
          eventId={eventId}
          packId={evento.packId}
          initialExpectedGuests={evento.expectedGuests}
          initialTimezone={evento.fuso}
          initialIdentityTokens={evento.identityTokens}
        />
      )}
    </EventPageLayout>
  );
}
