import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { resolveOpenEvent } from "@/features/guest/data/resolve-open-event";
import { eventVars, marcaVars } from "@/features/guest/lib/event-vars";
import { estiloAntiFlash, sanearVars } from "@/features/guest/lib/theme-style";
import { readThemePreference, THEME_COOKIE } from "@/features/guest/lib/theme-preference";
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

  // `eventVars` carrega `identityTokens` do evento — dado do anfitrião, não
  // validado por formato em nenhuma camada anterior. Antes de interpolar no
  // `<style>` bruto, cada var passa por `sanearVars`: valor que quebraria o
  // parser CSS (e abriria injeção de seletor/`@import`/`url()`) cai no
  // fallback da marca, nunca fica ausente.
  const claro = sanearVars(
    eventVars(r.evento, "light") as Record<string, string>,
    marcaVars("light") as Record<string, string>,
  );
  const escuro = sanearVars(
    eventVars(r.evento, "dark") as Record<string, string>,
    marcaVars("dark") as Record<string, string>,
  );
  const prefServidor = readThemePreference((await cookies()).get(THEME_COOKIE)?.value);

  const session = await guestSession();
  const withSession = isSameEventSession(session, r.evento.eventoId);

  return (
    <div className="guest-tema" data-tema={prefServidor ?? undefined} id="guest-root">
      <style>{estiloAntiFlash(claro, escuro)}</style>
      <link rel="manifest" href={`/e/${encodeURIComponent(slug)}/manifest.webmanifest`} />
      {withSession && <GlobalQueue eventoId={session.eventoId} />}
      {children}
    </div>
  );
}
