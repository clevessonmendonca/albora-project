import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { AlbumDoAnfitriao } from "./album-cliente";

export const dynamic = "force-dynamic";

export default async function PaginaAlbum({
  params,
}: {
  params: Promise<{ eventoId: string }>;
}) {
  const { eventoId } = await params;

  return (
    <EventPageLayout eventoId={eventoId} section="O álbum">
      <AlbumDoAnfitriao eventoId={eventoId} />
    </EventPageLayout>
  );
}
