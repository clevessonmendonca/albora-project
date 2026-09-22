import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { FotosPage } from "@/features/admin/components/client/fotos-page";

export const dynamic = "force-dynamic";

export default async function PaginaFotos({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { eventId } = await params;
  const { aba } = await searchParams;

  return (
    <EventPageLayout eventId={eventId} section="Fotos" nav="primary">
      {({ canManageCoupleOnly }) => (
        <FotosPage eventoId={eventId} canExport={canManageCoupleOnly} abaInicial={aba ?? null} />
      )}
    </EventPageLayout>
  );
}
