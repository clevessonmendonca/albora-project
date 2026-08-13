import type { Metadata } from "next";
import { Suspense } from "react";
import { AlbumContent } from "@/features/album/components/server/album-content";
import { AlbumPageSkeleton } from "@/features/album/components/skeletons/album-page-skeleton";
import { resolveOpenEvent } from "@/features/guest/data/resolve-open-event";
import { guestSession } from "@/features/guest/data/guest-session";
import { Aviso } from "../aviso";
import { SemEntrada } from "../sem-entrada";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "O álbum",
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
      <Aviso titulo="Essa festa não está aberta agora" texto="Volte pelo QR da mesa para conferir." />
    );
  }

  const session = await guestSession();
  if (!session) return <SemEntrada slug={slug} />;

  return (
    <Suspense fallback={<AlbumPageSkeleton />}>
      <AlbumContent
        slug={slug}
        eventoId={session.eventoId}
        sessaoId={session.sessaoId}
        evento={r.evento}
        missionParam={missionParam}
      />
    </Suspense>
  );
}
