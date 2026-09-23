import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { PreEventChecklist } from "@/features/admin/components/client/pre-event-checklist";

export const dynamic = "force-dynamic";

export default async function PreEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Pré-evento">
      {({ evento, missoes }) => (
        <PreEventChecklist
          eventId={eventId}
          sinais={{
            missoes,
            temIdentidade: Object.keys(evento.identityTokens).length > 0,
            convidadosEsperados: evento.expectedGuests,
            planoPago: evento.plan !== "free",
            gateDefinido: evento.interacaoAbreEm !== null,
          }}
        />
      )}
    </EventPageLayout>
  );
}
