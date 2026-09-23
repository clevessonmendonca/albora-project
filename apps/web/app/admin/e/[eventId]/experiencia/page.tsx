import { headers } from "next/headers";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { HubExperiencia } from "@/features/admin/components/server/hub-experiencia";

export const dynamic = "force-dynamic";

export default async function PaginaExperiencia({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "";
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocolo}://${host}` : "";

  return (
    <EventPageLayout eventId={eventId} section="Experiência">
      {(ctx) => <HubExperiencia ctx={ctx} origin={origin} />}
    </EventPageLayout>
  );
}
