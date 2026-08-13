import type { Metadata } from "next";
import { Suspense } from "react";
import { CoverContent } from "@/features/cover/components/server/cover-content";
import { CoverPageSkeleton } from "@/features/cover/components/skeletons/cover-page-skeleton";
import { resolveOpenEvent } from "@/features/guest/data/resolve-open-event";
import { guestSession } from "@/features/guest/data/guest-session";
import { Aviso } from "../aviso";
import { SemEntrada } from "../sem-entrada";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A festa",
  robots: { index: false, follow: false },
};

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await resolveOpenEvent(slug);

  if (r.estado !== "aberto") {
    return (
      <Aviso titulo="Essa festa não está aberta agora" texto="Volte pelo QR da mesa para conferir." />
    );
  }

  const session = await guestSession();
  if (!session) return <SemEntrada slug={slug} />;

  return (
    <Suspense fallback={<CoverPageSkeleton />}>
      <CoverContent
        slug={slug}
        eventoId={session.eventoId}
        sessaoId={session.sessaoId}
        evento={r.evento}
      />
    </Suspense>
  );
}
