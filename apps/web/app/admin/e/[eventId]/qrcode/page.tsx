import QRCode from "qrcode";
import { headers } from "next/headers";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { QrCodePrint } from "@/features/admin/components/client/qr-code-print";

export const dynamic = "force-dynamic";

export default async function QrCodePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="QR Code">
      {async ({ evento }) => {
        const hdrs = await headers();
        const host = hdrs.get("host") ?? "localhost";
        const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
        const guestUrl = `${proto}://${host}/e/${evento.slug}`;

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
          />
        );
      }}
    </EventPageLayout>
  );
}
