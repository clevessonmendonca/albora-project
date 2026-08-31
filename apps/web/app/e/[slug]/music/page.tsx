import type { Metadata } from "next";
import { Suspense } from "react";
import { MusicContent } from "@/features/music/components/server/music-content";
import { MusicPageSkeleton } from "@/features/music/components/skeletons/music-page-skeleton";
import { resolveOpenEvent } from "@/features/guest/data/resolve-open-event";
import { guestSession } from "@/features/guest/data/guest-session";
import { EventNotice } from "@/features/guest/components/client/event-notice";
import { NoSession } from "@/features/guest/components/client/no-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Música da festa",
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

  const session = await guestSession();
  if (!session) return <NoSession slug={slug} />;

  return (
    <Suspense fallback={<MusicPageSkeleton />}>
      <MusicContent slug={slug} evento={r.evento} />
    </Suspense>
  );
}
