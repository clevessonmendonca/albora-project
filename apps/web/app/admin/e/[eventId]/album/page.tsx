import Link from "next/link";
import { adminClasses } from "@/features/admin/components/server/admin-shell";
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
    <EventPageLayout eventId={eventId} section="Álbum" nav="primary">
      {({ canManageCoupleOnly }) => (
        <div className="flex min-w-0 flex-col gap-8">
          <header className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <h2 className="m-0 font-titulo text-[clamp(2rem,4vw,3.5rem)] font-light leading-tight">Uma história contada por muitas pessoas.</h2>
              <p className="tipo-body mb-0 mt-4 text-ink-2">Reúnam e escolham as fotos que contam a história de vocês. Revisitem cada momento depois da festa.</p>
            </div>
            <Link href={`/admin/e/${eventId}/qrcode`} className={`${adminClasses.secondaryButton} min-h-12`}>Como receber fotos</Link>
          </header>
          <FotosPage eventoId={eventId} canExport={canManageCoupleOnly} abaInicial={aba ?? null} />
          <section className="flex flex-wrap items-center justify-between gap-5 border-y border-linha py-6">
            <div><h2 className="tipo-subtitle m-0">Cada evento tem seu próprio álbum.</h2><p className="tipo-body mb-0 mt-2 text-ink-2">Compartilhe o convite para reunir os olhares dos seus convidados.</p></div>
            <Link href={`/admin/e/${eventId}/qrcode`} className={`${adminClasses.secondaryButton} min-h-12`}>Compartilhar convite</Link>
          </section>
        </div>
      )}
    </EventPageLayout>
  );
}
