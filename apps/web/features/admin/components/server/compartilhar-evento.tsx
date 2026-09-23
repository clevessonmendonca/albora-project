import React from "react";
import { AdminCard, AdminSection } from "@/features/admin/components/server/admin-shell";
import { EventLink } from "@/features/admin/components/client/event-link";
import { EventPieces } from "@/features/admin/components/client/event-pieces";
import { QrCodePrint } from "@/features/admin/components/client/qr-code-print";

type Props = {
  eventId: string;
  slug: string;
  eventName: string;
  guestUrl: string;
  whatsappUrl: string;
  svgString: string;
};

export function CompartilharEvento({
  eventId,
  slug,
  eventName,
  guestUrl,
  whatsappUrl,
  svgString,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      <AdminCard variant="highlight">
        <h2 className="tipo-subtitle m-0 mb-2 text-ink">Como o convidado chega</h2>
        <p className="tipo-body m-0 max-w-[52ch] text-ink-2">
          Ele aponta a câmera para o QR code na mesa, ou toca no link que vocês mandarem. Não
          precisa baixar aplicativo, criar conta nem digitar senha.
        </p>
      </AdminCard>

      <AdminSection>
        <h2 className="tipo-subtitle m-0 mb-4 text-ink">Links para mandar</h2>
        <div className="flex flex-col gap-4">
          <EventLink title="Link do convidado" url={guestUrl} />
          <EventLink title="Convite por WhatsApp" url={whatsappUrl} />
        </div>
      </AdminSection>

      <QrCodePrint
        eventId={eventId}
        slug={slug}
        eventName={eventName}
        guestUrl={guestUrl}
        svgString={svgString}
      />

      <AdminSection>
        <h2 className="tipo-subtitle m-0 mb-2 text-ink">Peças para imprimir</h2>
        <p className="tipo-body m-0 mb-4 max-w-[52ch] text-ink-2">
          Placa para a mesa, adesivo e folha de prova. Imprima e distribua pelo salão — uma placa
          só na entrada não é vista por quem já sentou.
        </p>
        <EventPieces eventId={eventId} slug={slug} />
      </AdminSection>
    </div>
  );
}
