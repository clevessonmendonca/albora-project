import type { Metadata } from "next";
import { AuthorProfilePage } from "@/features/guest-profile/components/client/author-profile-page";
import { EventNotice } from "@/features/guest/components/client/event-notice";
import { NoSession } from "@/features/guest/components/client/no-session";
import { guestSession } from "@/features/guest/data/guest-session";
import { resolveOpenEvent } from "@/features/guest/data/resolve-open-event";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Perfil",
  robots: { index: false, follow: false },
};

/** SSR não busca o perfil — isolamento de evento feito pelo cliente em `/api/guests/[autorId]` (`useAuthorFeed`). */
export default async function Pagina({
  params,
}: {
  params: Promise<{ slug: string; autorId: string }>;
}) {
  const { slug, autorId } = await params;
  const r = await resolveOpenEvent(slug);

  if (r.estado !== "aberto") {
    return (
      <EventNotice title="Essa festa não está aberta agora" body="Volte pelo QR da mesa para conferir." />
    );
  }

  const session = await guestSession();
  if (!session) return <NoSession slug={slug} />;

  return <AuthorProfilePage slug={slug} autorId={autorId} />;
}
