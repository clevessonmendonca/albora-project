import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { ConvidadosPage } from "@/features/admin/components/client/convidados-page";

export const dynamic = "force-dynamic";

export default async function PaginaConvidados({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ pessoa?: string }>;
}) {
  const { eventId } = await params;
  const { pessoa } = await searchParams;

  return (
    <EventPageLayout eventId={eventId} section="Convidados" nav="primary">
      <ConvidadosPage eventoId={eventId} pessoaInicial={pessoa ?? null} />
    </EventPageLayout>
  );
}
