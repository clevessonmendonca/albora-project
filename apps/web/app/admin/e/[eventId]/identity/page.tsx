import { VALIDADE_PRESIGN_SEGUNDOS } from "@albora/core";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { CoverImageEditor } from "@/features/admin/components/client/cover-image-editor";
import { IdentityEditor } from "@/features/admin/components/client/identity-editor";
import {
  FaixaDeDestaque,
  GradeDePaineis,
  ColunaDeApoio,
  IntroDaPagina,
  botaoDoPainel,
} from "@/features/admin/components/server/kit-do-painel";
import { signGet } from "@/lib/r2";

export const dynamic = "force-dynamic";

export default async function IdentityPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId}>
      {async ({ evento }) => {
        const coverImageUrl = evento.coverImageKey
          ? (await signGet(evento.coverImageKey, VALIDADE_PRESIGN_SEGUNDOS)).toString()
          : null;

        return (
          <>
            <IntroDaPagina
              eyebrow="Seu estilo"
              titulo="Identidade do evento"
              subtitulo="Deixe a página com a cara do seu evento."
              acao={
                // Alcança o <form id="identidade-form"> do IdentityEditor pelo atributo HTML
                // `form` — o cabeçalho é server-rendered e não tem acesso ao estado do editor.
                <button
                  type="submit"
                  form="identidade-form"
                  className={botaoDoPainel({ variant: "primary" })}
                >
                  Salvar alterações
                </button>
              }
            />
            <FaixaDeDestaque
              eyebrow="A identidade do evento"
              titulo="O primeiro olhar para a festa."
              descricao="A página do evento começa com o nome e a imagem que representam esta celebração."
            />

            <GradeDePaineis>
              <IdentityEditor
                eventId={eventId}
                packId={evento.packId}
                initialExpectedGuests={evento.expectedGuests}
                initialTimezone={evento.fuso}
                initialIdentityTokens={evento.identityTokens}
                initialTitle={evento.title}
              />
              <ColunaDeApoio>
                <CoverImageEditor
                  eventId={eventId}
                  initialCoverImageUrl={coverImageUrl}
                  initialCoverImageKey={evento.coverImageKey}
                />
              </ColunaDeApoio>
            </GradeDePaineis>
          </>
        );
      }}
    </EventPageLayout>
  );
}
