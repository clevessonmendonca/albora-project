import { Plus } from "lucide-react";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { MissionsEditorLoader } from "@/features/admin/components/server/missions-editor-loader";
import {
  FaixaDeDestaque,
  IntroDaPagina,
  botaoDoPainel,
} from "@/features/admin/components/server/kit-do-painel";

export const dynamic = "force-dynamic";

export default async function MissionsAdminPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId}>
      {({ evento }) => (
        <>
          <IntroDaPagina
            eyebrow="Participação"
            titulo="Missões"
            subtitulo="Ideias simples para os convidados registrarem o que vocês talvez não vejam."
            acao={
              <a
                href="#nova-missao-personalizada"
                className={botaoDoPainel({ variant: "primary" })}
              >
                <Plus size={16} aria-hidden />
                Criar missão
              </a>
            }
          />
          <FaixaDeDestaque
            eyebrow="Ideias para participar"
            titulo="Olhe para o que acontece ao redor."
            descricao="Pequenos desafios convidam os convidados a fotografar detalhes que passariam despercebidos."
          />
          <MissionsEditorLoader
            eventId={eventId}
            packId={evento.packId}
            identityTokens={evento.identityTokens}
          />
        </>
      )}
    </EventPageLayout>
  );
}
