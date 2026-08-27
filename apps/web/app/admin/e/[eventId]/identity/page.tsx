import { VALIDADE_PRESIGN_SEGUNDOS } from "@albora/core";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { CoverImageEditor } from "@/features/admin/components/client/cover-image-editor";
import { IdentityEditor } from "@/features/admin/components/client/identity-editor";
import { signGet } from "@/lib/r2";

export const dynamic = "force-dynamic";

export default async function IdentityPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Identidade">
      {async ({ evento }) => {
        const coverImageUrl = evento.coverImageKey
          ? (await signGet(evento.coverImageKey, VALIDADE_PRESIGN_SEGUNDOS)).toString()
          : null;

        return (
          <>
            <IdentityEditor
              eventId={eventId}
              packId={evento.packId}
              initialExpectedGuests={evento.expectedGuests}
              initialTimezone={evento.fuso}
              initialIdentityTokens={evento.identityTokens}
            />
            <CoverImageEditor
              eventId={eventId}
              initialCoverImageUrl={coverImageUrl}
              initialCoverImageKey={evento.coverImageKey}
            />
          </>
        );
      }}
    </EventPageLayout>
  );
}
