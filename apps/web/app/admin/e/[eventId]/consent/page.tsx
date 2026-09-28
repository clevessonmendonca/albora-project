import Link from "next/link";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { ConsentVersions } from "@/features/admin/components/client/consent-versions";
import { acaoTextual, IntroDaPagina } from "@/features/admin/components/server/kit-do-painel";

export const dynamic = "force-dynamic";

export default async function PaginaConsentimento({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId}>
      <IntroDaPagina
        eyebrow="Configurações"
        titulo="Consentimento e retenção"
        subtitulo="Auditoria LGPD: o texto exato que os convidados aceitaram e quantos aceitaram, sem nomes individuais."
        acao={
          <Link href={`/admin/e/${eventId}/ajustes`} className={acaoTextual}>
            ← Voltar para Configurações
          </Link>
        }
      />
      <ConsentVersions eventoId={eventId} />
    </EventPageLayout>
  );
}
