import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin/components/server/admin-shell";
import { EventNav } from "@/features/admin/components/client/event-nav";
import { loadEventPage, type AdminEventPageContext } from "@/features/admin/data/load-event-page";

type Props = {
  eventoId: string;
  /** Ex.: "Convidados". Omita no painel ao vivo. */
  section?: string;
  children: ReactNode | ((ctx: AdminEventPageContext) => ReactNode);
};

export async function EventPageLayout({ eventoId, section, children }: Props) {
  const ctx = await loadEventPage(eventoId);
  const subtitle = section ? `/${ctx.evento.slug} · ${section}` : `/${ctx.evento.slug}`;

  return (
    <AdminShell
      title={ctx.name}
      subtitle={subtitle}
      back={{ label: "Seus eventos", href: "/admin" }}
    >
      <EventNav eventoId={eventoId} />
      {typeof children === "function" ? children(ctx) : children}
    </AdminShell>
  );
}
