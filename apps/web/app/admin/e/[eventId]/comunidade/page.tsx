import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { Comunidade } from "@/features/admin/components/server/descobrir";

export const dynamic = "force-dynamic";

export default async function Pagina({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ filtro?: string; antes?: string }>;
}) {
  const { eventId } = await params;
  const { filtro, antes } = await searchParams;

  return (
    <EventPageLayout eventId={eventId} section="Comunidade" nav="primary">
      <Comunidade eventId={eventId} filtro={filtro} antes={antes} />
    </EventPageLayout>
  );
}
