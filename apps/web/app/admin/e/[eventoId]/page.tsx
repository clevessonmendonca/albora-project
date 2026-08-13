import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { ControlesDoEvento } from "./controles";
import { ResumoAoVivo } from "./resumo-ao-vivo";

export const dynamic = "force-dynamic";

export default async function Pagina({
  params,
}: {
  params: Promise<{ eventoId: string }>;
}) {
  const { eventoId } = await params;

  return (
    <EventPageLayout eventoId={eventoId}>
      {({ evento }) => (
        <>
          <ResumoAoVivo eventoId={eventoId} />
          <ControlesDoEvento
            eventoId={evento.eventoId}
            slug={evento.slug}
            inicial={evento.moderacao}
            interacaoAbreEmInicial={evento.interacaoAbreEm?.toISOString() ?? null}
          />
        </>
      )}
    </EventPageLayout>
  );
}
