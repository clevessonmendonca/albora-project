import QRCode from "qrcode";
import { headers } from "next/headers";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { QrCodePrint } from "@/features/admin/components/client/qr-code-print";
import { PACKS } from "@albora/packs";
import { assinarGet } from "@/lib/r2";
import { typePhoto } from "@/features/admin/components/client/onboarding/onboarding-photos";

export const dynamic = "force-dynamic";

export default async function QrCodePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="QR Code" nav="detail">
      {async ({ evento }) => {
        const hdrs = await headers();
        const host = hdrs.get("host") ?? "localhost";
        const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
        const guestUrl = `${proto}://${host}/e/${evento.slug}`;
        let coverImageUrl = typePhoto(PACKS[evento.packId]?.ordemCriacao);
        if (evento.coverImageKey) {
          try { coverImageUrl = await assinarGet(evento.coverImageKey, 900); } catch { /* A capa de exemplo preserva o convite se o storage estiver indisponível. */ }
        }
        const dateLabel = new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "long", timeStyle: "short", timeZone: evento.fuso,
        }).format(evento.comecaEm);

        const svgString = await QRCode.toString(guestUrl, {
          type: "svg",
          errorCorrectionLevel: "M",
          margin: 2,
          width: 400,
        });

        return (
          <QrCodePrint
            eventId={eventId}
            slug={evento.slug}
            eventName={evento.title ?? evento.slug}
            guestUrl={guestUrl}
            svgString={svgString}
            coverImageUrl={coverImageUrl}
            dateLabel={dateLabel}
            isDraft={evento.status === "draft"}
          />
        );
      }}
    </EventPageLayout>
  );
}
