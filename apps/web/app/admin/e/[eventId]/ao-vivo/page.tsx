import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { AoVivoTela } from "@/features/admin/components/client/ao-vivo-tela";

export const dynamic = "force-dynamic";

/** Central operacional: preserva consultas, permissões e comandos do painel. */
export default async function LiveEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return (
    <EventPageLayout eventId={eventId} section="Dia do evento" nav="primary">
      {({ evento, name, canManageCoupleOnly }) => (
        <AoVivoTela
          eventId={eventId}
          name={name}
          controls={{
            eventId,
            slug: evento.slug,
            plan: evento.plan,
            initial: evento.moderacao,
            initialInteractionOpensAt: evento.interacaoAbreEm?.toISOString() ?? null,
            initialDeliveryOpensAt: evento.deliveryOpensAt?.toISOString() ?? null,
            initialStatus: evento.status,
            canManageCoupleOnly,
          }}
        />
      )}
    </EventPageLayout>
  );
}
