import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { EventHub } from "@/features/admin/components/client/event-hub";
import { EventControls } from "@/features/admin/components/client/event-controls";

export const dynamic = "force-dynamic";

/**
 * Ajustes do evento.
 *
 * A tela era só um menu de atalhos enquanto a Home carregava os onze blocos de
 * controle em todas as fases — os controles moravam onde não se decide e os
 * atalhos moravam onde se decide. Agora os controles ficam aqui, e a Home pede
 * só o que é decisão do momento.
 */
export default async function EventoPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Evento" nav="primary">
      {({ evento, canManageCoupleOnly }) => (
        <div className="flex flex-col gap-8">
          <EventHub eventId={eventId} />

          <section>
            <h2 className="tipo-label m-0 mb-3 text-ink-3">Controles do evento</h2>
            <EventControls
              eventId={evento.eventoId}
              slug={evento.slug}
              plan={evento.plan}
              initial={evento.moderacao}
              initialInteractionOpensAt={evento.interacaoAbreEm?.toISOString() ?? null}
              initialDeliveryOpensAt={evento.deliveryOpensAt?.toISOString() ?? null}
              initialStatus={evento.status}
              canManageCoupleOnly={canManageCoupleOnly}
            />
          </section>
        </div>
      )}
    </EventPageLayout>
  );
}
