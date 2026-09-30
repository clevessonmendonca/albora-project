import Link from "next/link";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { AdminCard, adminClasses } from "@/features/admin/components/server/admin-shell";
import { LiveSummary } from "@/features/admin/components/client/live-summary";
import { ReviewQueue } from "@/features/admin/components/client/review-queue";
import { EventControls } from "@/features/admin/components/client/event-controls";

export const dynamic = "force-dynamic";

/** Central operacional: usa as mesmas consultas e comandos das telas existentes. */
export default async function LiveEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <EventPageLayout eventId={eventId} section="Ao vivo" nav="primary">
    {({ evento, canManageCoupleOnly }) => (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-xl">
            <h2 className="m-0 font-titulo text-[clamp(2rem,4vw,3.5rem)] font-light leading-tight">O dia acontece.<br />Você acompanha.</h2>
            <p className="tipo-body mb-0 mt-3 text-ink-2">Revise os registros e acompanhe o que aparece no telão.</p>
          </div>
          <Link className={adminClasses.secondaryButton} href={`/admin/e/${eventId}/qrcode`}>Abrir QR</Link>
        </div>
        <LiveSummary eventoId={eventId} />
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <AdminCard><h2 className="tipo-subtitle mt-0 mb-5">Fotos para revisar</h2><ReviewQueue eventoId={eventId} /></AdminCard>
          <aside className="flex min-w-0 flex-col gap-5" aria-label="Controles da festa">
            <AdminCard>
              <h2 className="tipo-subtitle mt-0">Exibição no salão</h2>
              <p className="tipo-body text-ink-2">Abra o telão no dispositivo conectado à TV ou ao projetor.</p>
              <Link href="/wall-display" target="_blank" rel="noopener noreferrer" className={adminClasses.primaryButton}>Abrir o telão</Link>
            </AdminCard>
            <EventControls eventId={eventId} slug={evento.slug} plan={evento.plan} initial={evento.moderacao} initialInteractionOpensAt={evento.interacaoAbreEm?.toISOString() ?? null} initialDeliveryOpensAt={evento.deliveryOpensAt?.toISOString() ?? null} initialStatus={evento.status} canManageCoupleOnly={canManageCoupleOnly} secoes={["telao", "moderacao", "interacao"]} />
          </aside>
        </div>
      </div>
    )}
  </EventPageLayout>;
}
