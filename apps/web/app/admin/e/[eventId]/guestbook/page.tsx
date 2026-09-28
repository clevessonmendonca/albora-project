import Link from "next/link";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { GuestbookEditor } from "@/features/admin/components/client/guestbook-editor";
import {
  FaixaDeDestaque,
  IntroDaPagina,
  acaoTextual,
} from "@/features/admin/components/server/kit-do-painel";

export const dynamic = "force-dynamic";

export default async function GuestbookPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId}>
      {({ evento }) => (
        <>
          <Link href={`/admin/e/${eventId}/missions`} className={`${acaoTextual} mb-4 inline-block`}>
            ← Voltar para Missões
          </Link>
          <IntroDaPagina
            eyebrow="Participação"
            titulo="Recado do evento"
            subtitulo="Uma mensagem de vocês, em texto ou áudio, para quem chega na festa."
          />
          <FaixaDeDestaque
            eyebrow="Um recado para cada convidado"
            titulo="A primeira coisa que ele vê ao abrir o álbum."
            descricao="Escreva ou grave o recado e escolha o horário em que ele aparece — cada convidado vê uma vez só."
          />
          <GuestbookEditor eventId={eventId} packId={evento.packId} />
        </>
      )}
    </EventPageLayout>
  );
}
