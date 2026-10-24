import { podeUsarTelao } from "@albora/core";
import Link from "next/link";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { AdminCard, adminClasses } from "@/features/admin/components/server/admin-shell";
import { LiveSummary } from "@/features/admin/components/client/live-summary";
import { ReviewQueue } from "@/features/admin/components/client/review-queue";
import { WallLinkSender } from "@/features/admin/components/client/wall-link-sender";
import { EventControls } from "@/features/admin/components/client/event-controls";

export const dynamic = "force-dynamic";

/** Central operacional: preserva consultas, permissões e comandos do painel. */
export default async function LiveEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return (
    <EventPageLayout eventId={eventId} section="Dia do evento" nav="primary">
      {({ evento, name, canManageCoupleOnly }) => {
        const controls = {
          eventId,
          slug: evento.slug,
          plan: evento.plan,
          initial: evento.moderacao,
          initialInteractionOpensAt: evento.interacaoAbreEm?.toISOString() ?? null,
          initialDeliveryOpensAt: evento.deliveryOpensAt?.toISOString() ?? null,
          initialStatus: evento.status,
          canManageCoupleOnly,
        };

        return (
          <div className="flex min-w-0 flex-col gap-6 lg:gap-8">
            <header className="flex flex-wrap items-end justify-between gap-5">
              <div className="min-w-0 max-w-2xl">
                <h2 className="m-0 text-balance font-titulo text-[clamp(2rem,4vw,3.5rem)] font-light leading-tight">
                  O dia acontece.<br /><em className="font-light">Você acompanha.</em>
                </h2>
                <p className="tipo-body mb-0 mt-4 break-words text-ink-2">{name}</p>
              </div>
              <Link className={`${adminClasses.secondaryButton} min-h-12`} href={`/admin/e/${eventId}/qrcode`}>
                Abrir QR
              </Link>
            </header>

            <EventControls {...controls} secoes={["telao"]} />
            <LiveSummary eventoId={eventId} />

            <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)]">
              <AdminCard className="min-w-0 p-4 sm:p-6">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="tipo-subtitle m-0">Fotos que chegaram</h2>
                    <p className="tipo-body mb-0 mt-2 max-w-prose text-ink-2">
                      Revise as fotos sinalizadas antes de liberar a exibição.
                    </p>
                  </div>
                  <Link href={`/admin/e/${eventId}/album`} className={`${adminClasses.secondaryButton} min-h-12`}>
                    Ver álbum
                  </Link>
                </div>
                <ReviewQueue eventoId={eventId} />
              </AdminCard>

              <aside className="flex min-w-0 flex-col gap-6" aria-label="Telão e acesso dos convidados">
                <AdminCard className="min-w-0 p-4 sm:p-6">
                  <h2 className="tipo-subtitle m-0">Na TV ou no projetor</h2>
                  <p className="tipo-body mb-5 mt-2 text-ink-2">
                    Prepare a tela do salão para receber as fotos da festa.
                  </p>
                  <ol className="m-0 list-decimal space-y-3 border-y border-linha py-5 pl-5 text-sm leading-relaxed text-ink-2">
                    <li>Conecte um computador à TV ou ao projetor.</li>
                    <li>Abra o telão nesse computador e siga as instruções de conexão.</li>
                    <li>Use os controles desta página para pausar ou retomar a exibição.</li>
                  </ol>
                  <Link href="/wall-display" target="_blank" rel="noopener noreferrer" className={`${adminClasses.primaryButton} mt-5 min-h-12 w-full`}>
                    Abrir telão <span className="sr-only">em uma nova aba</span>
                  </Link>
                  <p className="tipo-caption mb-0 mt-3 text-ink-2">
                    O convite continua disponível pelo QR enquanto o telão está pausado.
                  </p>
                  <WallLinkSender eventId={eventId} podeUsarTelao={podeUsarTelao(evento.plan)} />
                </AdminCard>

                <section className="border-y border-linha py-6" aria-labelledby="live-invite-heading">
                  <h2 id="live-invite-heading" className="m-0 font-titulo text-2xl font-light">Mais gente, mais olhares.</h2>
                  <p className="tipo-body mb-4 mt-3 text-ink-2">
                    Deixe o QR em um lugar fácil de ver. Os convidados entram pelo celular e enviam as fotos.
                  </p>
                  <Link href={`/admin/e/${eventId}/qrcode`} className={`${adminClasses.secondaryButton} min-h-12`}>Ver convite e QR</Link>
                </section>

                <details className="min-w-0 rounded-superficie border border-linha">
                  <summary className="min-h-12 cursor-pointer px-5 py-4 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-acento">
                    Moderação e horário de participação
                  </summary>
                  <div className="px-3 pb-3 sm:px-5 sm:pb-5">
                    <EventControls {...controls} secoes={["moderacao", "interacao"]} />
                  </div>
                </details>
              </aside>
            </div>
          </div>
        );
      }}
    </EventPageLayout>
  );
}
