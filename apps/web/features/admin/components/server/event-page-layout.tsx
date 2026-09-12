import type { ReactNode } from "react";
import { SkipLink } from "@albora/ui-web";
import { AdminShell, adminVars } from "@/features/admin/components/server/admin-shell";
import { AppNav } from "@/features/admin/components/client/app-nav";
import { EventSidebar } from "@/features/admin/components/client/event-sidebar";
import { SignOutButton } from "@/features/admin/components/client/sign-out-button";
import { CoupleFollowMode } from "@/features/admin/components/client/couple-follow-mode";
import { ModerationCountProvider } from "@/features/admin/components/client/moderation-count-context";
import { showsFollowMode } from "@/features/admin/lib/follow-mode";
import { loadEventPage, type AdminEventPageContext } from "@/features/admin/data/load-event-page";

type Props = {
  eventId: string;
  /** Ex.: "Convidados". Omita no painel ao vivo. */
  section?: string;
  /** Cosmético — habilita o modo Acompanhar nesta seção; `canManageCoupleOnly` é o único gate de ação real. */
  allowFollowMode?: boolean;
  /**
   * "primary": app-shell com sidebar (desktop) / bottom-bar (mobile) — Início/Fotos/Convidados/Evento.
   * "detail" (default): coluna centrada com back "← Evento" — sub-telas do hub.
   */
  nav?: "primary" | "detail";
  children: ReactNode | ((ctx: AdminEventPageContext) => ReactNode);
};

/** Rótulo de contagem regressiva a partir do início do evento. */
function countdownLabel(comecaEm: Date): string {
  const dias = Math.ceil((comecaEm.getTime() - Date.now()) / 86_400_000);
  if (dias > 1) return `Faltam ${dias} dias`;
  if (dias === 1) return "Falta 1 dia";
  if (dias === 0) return "É hoje";
  return "Evento encerrado";
}

export async function EventPageLayout({
  eventId,
  section,
  allowFollowMode = false,
  nav = "detail",
  children,
}: Props) {
  const ctx = await loadEventPage(eventId);
  const content = typeof children === "function" ? children(ctx) : children;

  const inner = (
    <ModerationCountProvider>
      {showsFollowMode(ctx.role, allowFollowMode) ? (
        <CoupleFollowMode eventoId={eventId} dense={content} />
      ) : (
        content
      )}
    </ModerationCountProvider>
  );

  // Sub-telas do hub: coluna centrada e back "← Evento".
  if (nav === "detail") {
    return (
      <AdminShell
        title={ctx.name}
        subtitle={section ? `/${ctx.evento.slug} · ${section}` : `/${ctx.evento.slug}`}
        back={{ label: "Evento", href: `/admin/e/${eventId}/evento` }}
      >
        {inner}
      </AdminShell>
    );
  }

  // Abas primárias: app-shell com sidebar no desktop e bottom-bar no mobile.
  const countdown = countdownLabel(ctx.evento.comecaEm);
  return (
    <>
      <SkipLink />
      <main
        id="main-content"
        className="min-h-dvh bg-bg font-[family-name:var(--fonte-corpo)] text-ink"
        style={adminVars()}
      >
        <div className="mx-auto flex w-full max-w-[80rem]">
          <EventSidebar eventId={eventId} name={ctx.name} countdown={countdown} />
          <div className="min-w-0 flex-1 px-[clamp(1.25rem,4vw,3rem)] pb-24 pt-[clamp(1.5rem,4vw,2.5rem)] sm:pb-[clamp(2rem,4vw,3rem)]">
            <header className="mb-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                {section && <h1 className="tipo-title m-0 leading-tight">{section}</h1>}
                <span className="tipo-caption text-ink-3 sm:hidden">
                  {ctx.name} · {countdown}
                </span>
              </div>
              <div className="shrink-0 sm:hidden">
                <SignOutButton />
              </div>
            </header>
            {inner}
          </div>
        </div>
        <AppNav eventId={eventId} />
      </main>
    </>
  );
}
