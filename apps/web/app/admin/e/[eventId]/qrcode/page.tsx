import QRCode from "qrcode";
import { headers } from "next/headers";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { CompartilharEvento } from "@/features/admin/components/server/compartilhar-evento";
import { eventEntryUrl, whatsappInviteUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export default async function PaginaCompartilhar({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Compartilhar">
      {async ({ evento }) => {
        const hdrs = await headers();
        const host = hdrs.get("host") ?? "localhost";
        const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
        const origin = `${proto}://${host}`;
        const guestUrl = `${origin}/e/${evento.slug}`;

        const svgString = await QRCode.toString(guestUrl, {
          type: "svg",
          errorCorrectionLevel: "M",
          margin: 2,
          width: 400,
        });

        return (
          <CompartilharEvento
            eventId={eventId}
            slug={evento.slug}
            eventName={evento.title ?? evento.slug}
            guestUrl={eventEntryUrl(origin, evento.slug, "link")}
            whatsappUrl={whatsappInviteUrl(origin, evento.slug)}
            svgString={svgString}
          />
        );
      }}
    </EventPageLayout>
  );
}
