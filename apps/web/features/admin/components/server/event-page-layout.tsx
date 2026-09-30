import type { ReactNode } from "react";
import Link from "next/link";
import { SkipLink } from "@albora/ui-web";
import { adminVars } from "@/features/admin/components/server/admin-shell";
import { AdminShell } from "@/features/admin/components/server/admin-shell-root";
import { AppNav } from "@/features/admin/components/client/app-nav";
import { EventSidebar } from "@/features/admin/components/client/event-sidebar";
import { MenuDaConta } from "@/features/admin/components/client/menu-da-conta";
import { CoupleFollowMode } from "@/features/admin/components/client/couple-follow-mode";
import { ModerationCountProvider } from "@/features/admin/components/client/moderation-count-context";
import { showsFollowMode } from "@/features/admin/lib/follow-mode";
import { loadEventPage, type AdminEventPageContext } from "@/features/admin/data/load-event-page";
import { rotuloContagem } from "@/features/admin/lib/contagem";

/** O plano como o casal o conhece na compra, não como a coluna o guarda. */
function rotuloDoPlano(plan: string): string {
  if (plan === "vendor") return "Pelo fornecedor";
  return plan === "free" ? "Plano Essencial" : "Plano Completo";
}
import { cookies } from "next/headers";
import { estiloAntiFlash } from "@/features/guest/lib/theme-style";
import { readThemePreference, THEME_COOKIE } from "@/features/guest/lib/theme-preference";
import { ADMIN_TEMA_CLASSE } from "@/features/admin/lib/tema-do-painel";
import { RAIL_COOKIE, railRecolhido } from "@/features/admin/lib/sidebar-recolhida";

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
        email={ctx.emailDaConta}
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
        <div className="mx-auto flex w-full max-w-[100rem]">
          <EventSidebar
              eventId={eventId}
              name={ctx.name}
              countdown={countdown}
              email={ctx.emailDaConta}
              plano={rotuloDoPlano(ctx.evento.plan)}
              inicialRecolhida={railRecolhido((await cookies()).get(RAIL_COOKIE)?.value)}
            />
          <div className="min-w-0 flex-1 px-[clamp(1.25rem,4vw,3rem)] pb-24 pt-[clamp(1.5rem,4vw,2.5rem)] lg:pb-[clamp(2rem,4vw,3rem)]">
            <header className="mb-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                {/*
                  Migalha, como no protótipo: o nome do evento situa a seção.
                  Só no desktop — no celular o mesmo par já aparece abaixo do
                  título, e repetir custaria duas linhas de uma tela estreita.
                */}
                {section && (
                  <nav aria-label="Onde você está" className="mb-1 hidden lg:block">
                    <ol className="m-0 flex list-none items-center gap-2 p-0">
                      <li>
                        <Link
                          href={`/admin/e/${eventId}`}
                          className="tipo-label text-ink-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink"
                        >
                          {ctx.name}
                        </Link>
                      </li>
                      <li aria-hidden="true" className="tipo-label text-ink-3">
                        /
                      </li>
                      <li className="tipo-label text-ink-2">{section}</li>
                    </ol>
                  </nav>
                )}
                {section && <h1 className="tipo-title m-0 leading-tight">{section}</h1>}
                <span className="tipo-caption text-ink-3 lg:hidden">
                  {ctx.name} · {countdown}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <MenuDaConta email={ctx.emailDaConta} />
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
