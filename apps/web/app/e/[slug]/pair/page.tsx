import type { Metadata } from "next";
import { PairPage } from "@/features/pairing/components/client/pair-page";
import { resolveOpenEvent } from "@/features/guest/data/resolve-open-event";
import {
  guestSession,
  isSameEventSession,
} from "@/features/guest/data/guest-session";
import { EventNotice } from "@/features/guest/components/client/event-notice";
import { NoSession } from "@/features/guest/components/client/no-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Parear o app",
  robots: { index: false, follow: false },
};

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await resolveOpenEvent(slug);

  if (r.estado !== "aberto") {
    return (
      <EventNotice title="Essa festa não está aberta agora" body="Volte pelo QR da mesa para conferir." />
    );
  }

  const sessao = await guestSession();
  if (!isSameEventSession(sessao, r.evento.eventoId)) {
    return <NoSession slug={slug} />;
  }

  return <PairPage slug={slug} />;
}
