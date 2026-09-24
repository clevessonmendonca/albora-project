import { listarDesafios, withEvent } from "@albora/db";
import { getPool } from "@/lib/db";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { PreEventChecklist } from "@/features/admin/components/client/pre-event-checklist";

export const dynamic = "force-dynamic";

export default async function PreEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  // Só esta tela precisa da contagem: ler em loadEventPage cobraria uma consulta
  // de toda página do admin para um item de checklist.
  const missoes = await withEvent(getPool(), eventId, (c) => listarDesafios(c, eventId, null));

  return (
    <EventPageLayout eventId={eventId} section="Pré-evento" nav="detail">
      {({ evento }) => (
        <PreEventChecklist
          eventId={eventId}
          marcados={evento.marcosDePreparo.checklist ?? {}}
          sinais={{
            missoes: missoes.length,
            convidadosEsperados: evento.expectedGuests,
            planoPago: evento.plan !== "free",
            gateDefinido: evento.interacaoAbreEm !== null,
          }}
        />
      )}
    </EventPageLayout>
  );
}
