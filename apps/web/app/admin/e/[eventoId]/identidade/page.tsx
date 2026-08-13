import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { IdentidadeDoEvento } from "./identidade-cliente";

export const dynamic = "force-dynamic";

export default async function PaginaIdentidade({
  params,
}: {
  params: Promise<{ eventoId: string }>;
}) {
  const { eventoId } = await params;

  return (
    <EventPageLayout eventoId={eventoId} section="Identidade">
      {({ evento }) => (
        <IdentidadeDoEvento
          eventoId={eventoId}
          packId={evento.packId}
          expectedGuestsInicial={evento.expectedGuests}
          identityTokensInicial={evento.identityTokens}
        />
      )}
    </EventPageLayout>
  );
}
