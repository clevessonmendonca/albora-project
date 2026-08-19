import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin/components/server/admin-shell";
import { EventNav } from "@/features/admin/components/client/event-nav";
import { CoupleFollowMode } from "@/features/admin/components/client/couple-follow-mode";
import { showsFollowMode } from "@/features/admin/lib/follow-mode";
import { loadEventPage, type AdminEventPageContext } from "@/features/admin/data/load-event-page";

type Props = {
  eventId: string;
  /** Ex.: "Convidados". Omita no painel ao vivo. */
  section?: string;
  /**
   * Habilita o modo Acompanhar do casal nesta seção — hoje só a "Ao vivo".
   * Cosmético/de exibição; `canManageCoupleOnly` continua o único gate de ação.
   */
  allowFollowMode?: boolean;
  children: ReactNode | ((ctx: AdminEventPageContext) => ReactNode);
};

export async function EventPageLayout({
  eventId,
  section,
  allowFollowMode = false,
  children,
}: Props) {
  const ctx = await loadEventPage(eventId);
  const subtitle = section ? `/${ctx.evento.slug} · ${section}` : `/${ctx.evento.slug}`;
  const content = typeof children === "function" ? children(ctx) : children;

  return (
    <AdminShell
      title={ctx.name}
      subtitle={subtitle}
      back={{ label: "Seus eventos", href: "/admin" }}
    >
      <EventNav eventId={eventId} />
      {showsFollowMode(ctx.role, allowFollowMode) ? (
        <CoupleFollowMode eventoId={eventId} dense={content} />
      ) : (
        content
      )}
    </AdminShell>
  );
}
