import React from "react";
import Link from "next/link";
import { EditorialTabs } from "@albora/ui-web";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { HostAlbum } from "@/features/admin/components/client/host-album";
import { ModerationPage } from "@/features/admin/components/client/moderation-page";
import { ABAS_FOTOS, abaAtiva } from "@/features/admin/lib/abas-fotos";

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
  const ativa = abaAtiva(aba);
  const abaAtual = ABAS_FOTOS.find((a) => a.id === ativa);

  return (
    <EventPageLayout eventId={eventId} section="Fotos">
      {({ canManageCoupleOnly }) => (
        <div className="flex flex-col gap-5">
          <EditorialTabs
            items={ABAS_FOTOS.map((a) => ({ label: a.rotulo, suffix: a.suffix }))}
            active={abaAtual?.suffix ?? ""}
            base={`/admin/e/${eventId}/album`}
            linkComponent={Link}
          />

          {ativa === "revisar" ? (
            <ModerationPage eventoId={eventId} />
          ) : (
            <HostAlbum
              eventoId={eventId}
              canExport={canManageCoupleOnly && ativa === "todas"}
              filtro={ativa === "destaques" ? "destaques" : "todas"}
            />
          )}
        </div>
      )}
    </EventPageLayout>
  );
}
