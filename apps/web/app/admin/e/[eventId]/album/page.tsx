import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { HostAlbum } from "@/features/admin/components/client/host-album";

export const dynamic = "force-dynamic";

export default async function PaginaAlbum({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="O álbum">
      {({ canManageCoupleOnly }) => (
        <HostAlbum eventoId={eventId} canExport={canManageCoupleOnly} />
      )}
    </EventPageLayout>
  );
}
