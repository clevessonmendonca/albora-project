import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { MissionsEditorLoader } from "@/features/admin/components/server/missions-editor-loader";

export const dynamic = "force-dynamic";

export default async function MissionsAdminPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Missões">
      {({ evento }) => (
        <MissionsEditorLoader
          eventId={eventId}
          packId={evento.packId}
          identityTokens={evento.identityTokens}
        />
      )}
    </EventPageLayout>
  );
}
