import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { RaizDoPainel } from "@/features/admin/components/server/raiz-do-painel";
import { CascaDoPainel } from "@/features/admin/components/client/casca-do-painel";
import { CoupleFollowMode } from "@/features/admin/components/client/couple-follow-mode";
import { ModerationCountProvider } from "@/features/admin/components/client/moderation-count-context";
import { showsFollowMode } from "@/features/admin/lib/follow-mode";
import { monograma } from "@/features/admin/lib/monograma";
import { loadEventPage, type AdminEventPageContext } from "@/features/admin/data/load-event-page";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";

type Props = {
  eventId: string;
  /** Cosmético — habilita o modo Acompanhar nesta seção; `canManageCoupleOnly` é o único gate de ação real. */
  allowFollowMode?: boolean;
  children: ReactNode | ((ctx: AdminEventPageContext) => ReactNode);
};

function dataCurta(quando: Date, fuso: string): string {
  return quando.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: fuso,
  });
}

export async function EventPageLayout({ eventId, allowFollowMode = false, children }: Props) {
  const ctx = await loadEventPage(eventId);
  const host = await hostFromToken((await cookies()).get(HOST_COOKIE)?.value);
  const content = typeof children === "function" ? children(ctx) : children;

  return (
    <ModerationCountProvider>
      <RaizDoPainel>
        <CascaDoPainel
          evento={{
            id: eventId,
            nome: ctx.name,
            data: dataCurta(ctx.evento.comecaEm, ctx.evento.fuso),
            monograma: monograma(ctx.name),
          }}
          perfil={{
            nome: host?.email ?? "Anfitrião",
            plano: `Plano ${ctx.evento.plan}`,
          }}
          hoje={new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: ctx.evento.fuso,
          })}
          raiz="Meu evento"
        >
          {showsFollowMode(ctx.role, allowFollowMode) ? (
            <CoupleFollowMode eventoId={eventId} dense={content} />
          ) : (
            content
          )}
        </CascaDoPainel>
      </RaizDoPainel>
    </ModerationCountProvider>
  );
}
