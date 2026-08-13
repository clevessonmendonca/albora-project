import type { Metadata } from "next";
import { Suspense } from "react";
import { MissionsContent } from "@/features/missions/components/server/missions-content";
import { MissionsPageSkeleton } from "@/features/missions/components/skeletons/missions-page-skeleton";
import { resolveOpenEvent } from "@/features/guest/data/resolve-open-event";
import { guestSession } from "@/features/guest/data/guest-session";
import { EventNotice } from "@/features/guest/components/client/event-notice";
import { NoSession } from "@/features/guest/components/client/no-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Missões",
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
    <Suspense fallback={<MissionsPageSkeleton />}>
      <MissionsContent
        slug={slug}
        eventoId={session.eventoId}
        sessaoId={session.sessaoId}
        evento={r.evento}
      />
    </Suspense>
  );
}
