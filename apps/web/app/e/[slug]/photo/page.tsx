import type { Metadata } from "next";
import { Suspense } from "react";
import { PhotoContent } from "@/features/photo/components/server/photo-content";
import { PhotoPageSkeleton } from "@/features/photo/components/skeletons/photo-page-skeleton";
import { resolveOpenEvent } from "@/features/guest/data/resolve-open-event";
import { guestSession } from "@/features/guest/data/guest-session";
import { EventNotice } from "@/features/guest/components/client/event-notice";
import { NoSession } from "@/features/guest/components/client/no-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enviar foto",
  robots: { index: false, follow: false },
};

export default async function Pagina({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ missao?: string }>;
}) {
  const { slug } = await params;
  const { missao: missionParam } = await searchParams;
  const r = await resolveOpenEvent(slug);

  if (r.estado !== "aberto") {
    return (
      <EventNotice title="Essa festa não está aberta agora" body="Volte pelo QR da mesa para conferir." />
    );
  }

  const session = await guestSession();
  if (!session) return <NoSession slug={slug} />;

  return (
    <Suspense fallback={<PhotoPageSkeleton />}>
      <PhotoContent
        slug={slug}
        eventoId={session.eventoId}
        sessaoId={session.sessaoId}
        evento={r.evento}
        missionParam={missionParam}
      />
    </Suspense>
  );
}
