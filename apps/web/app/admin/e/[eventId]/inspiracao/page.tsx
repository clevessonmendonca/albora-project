import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { Inspiracao } from "@/features/admin/components/server/descobrir";

export const dynamic = "force-dynamic";

export default async function Pagina({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { eventId } = await params;
  const { filtro } = await searchParams;

  return (
    <EventPageLayout eventId={eventId} section="Inspiração" nav="primary">
      <Inspiracao eventId={eventId} filtro={filtro} />
    </EventPageLayout>
  );
}
