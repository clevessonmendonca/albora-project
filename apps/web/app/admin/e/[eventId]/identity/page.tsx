import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { IdentityEditor } from "@/features/admin/components/client/identity-editor";

export const dynamic = "force-dynamic";

export default async function PaginaIdentidade({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Identidade">
      {({ evento }) => (
        <IdentityEditor
          eventoId={eventId}
          packId={evento.packId}
          expectedGuestsInicial={evento.expectedGuests}
          identityTokensInicial={evento.identityTokens}
        />
      )}
    </EventPageLayout>
  );
}
