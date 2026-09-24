import type { ReactNode } from "react";
import { SkipLink } from "@albora/ui-web";
import { adminVars } from "@/features/admin/components/server/admin-shell";
import { AdminShell } from "@/features/admin/components/server/admin-shell-root";
import { AppNav } from "@/features/admin/components/client/app-nav";
import { EventSidebar } from "@/features/admin/components/client/event-sidebar";
import { SignOutButton } from "@/features/admin/components/client/sign-out-button";
import { TemaDoPainelToggle } from "@/features/admin/components/client/tema-do-painel-toggle";
import { AjudaDoPainel } from "@/features/admin/components/client/ajuda-do-painel";
import { CoupleFollowMode } from "@/features/admin/components/client/couple-follow-mode";
import { ModerationCountProvider } from "@/features/admin/components/client/moderation-count-context";
import { showsFollowMode } from "@/features/admin/lib/follow-mode";
import { loadEventPage, type AdminEventPageContext } from "@/features/admin/data/load-event-page";
import { rotuloContagem } from "@/features/admin/lib/contagem";
import { cookies } from "next/headers";
import { estiloAntiFlash } from "@/features/guest/lib/theme-style";
import { readThemePreference, THEME_COOKIE } from "@/features/guest/lib/theme-preference";
import { ADMIN_TEMA_CLASSE } from "@/features/admin/lib/tema-do-painel";

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
        identidade={ctx.evento.identityTokens}
        title={ctx.name}
        subtitle={section ? `/${ctx.evento.slug} · ${section}` : `/${ctx.evento.slug}`}
        back={{ label: "Evento", href: `/admin/e/${eventId}/evento` }}
      >
        {inner}
      </AdminShell>
    );
  }

  // Abas primárias: app-shell com sidebar no desktop e bottom-bar no mobile.
  const countdown = rotuloContagem(ctx.evento);
  const preferencia = readThemePreference((await cookies()).get(THEME_COOKIE)?.value);
  const claro = adminVars("light", ctx.evento.identityTokens) as Record<string, string>;
  const escuro = adminVars("dark", ctx.evento.identityTokens) as Record<string, string>;

  return (
    <>
      <SkipLink />
      <style>{estiloAntiFlash(claro, escuro, `.${ADMIN_TEMA_CLASSE}`)}</style>
      <main
        id="main-content"
        className={`${ADMIN_TEMA_CLASSE} min-h-dvh bg-bg font-[family-name:var(--fonte-corpo)] text-ink`}
        {...(preferencia ? { "data-tema": preferencia } : {})}
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
              <div className="flex shrink-0 items-center gap-2">
                <TemaDoPainelToggle />
                <AjudaDoPainel />
                <div className="sm:hidden">
                  <SignOutButton />
                </div>
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
