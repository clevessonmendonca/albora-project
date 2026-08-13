import type { ReactNode } from "react";
import { resolveOpenEvent } from "@/features/guest/data/resolve-open-event";
import { eventVars } from "@/features/guest/lib/event-vars";
import { GlobalQueue } from "@/features/photo/components/client/global-queue";
import { guestSession, isSameEventSession } from "@/features/guest/data/guest-session";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = await resolveOpenEvent(slug);

  if (r.estado !== "aberto") return children;

  const vars = eventVars(r.evento);
  const session = await guestSession();
  const withSession = isSameEventSession(session, r.evento.eventoId);

  return (
    <div style={vars}>
      {withSession && <GlobalQueue eventoId={session.eventoId} />}
      {children}
    </div>
  );
}
