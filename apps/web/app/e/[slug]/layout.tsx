import type { CSSProperties, ReactNode } from "react";
import { cookies } from "next/headers";
import { resolveOpenEvent } from "@/features/guest/data/resolve-open-event";
import { eventVars } from "@/features/guest/lib/event-vars";
import { readThemePreference, THEME_COOKIE } from "@/features/guest/lib/theme-preference";
import { ThemeController } from "@/features/guest/components/client/theme-controller";
import { GlobalQueue } from "@/features/photo/components/client/global-queue";
import { guestSession, isSameEventSession } from "@/features/guest/data/guest-session";

/** `toCss` de `@albora/tokens` recebe `Tokens`; aqui já temos o record de vars. */
function cssDasVars(vars: CSSProperties): string {
  return Object.entries(vars)
    .map(([propriedade, valor]) => `${propriedade}: ${valor};`)
    .join(" ");
}

/**
 * `<style>` anti-flash — CSS puro, sem script inline.
 *
 * Os dois conjuntos de vars do evento (claro e escuro) ficam sempre no HTML;
 * quem decide qual se aplica é a cascata: sem preferência, a media query do
 * sistema resolve no primeiro frame; com cookie, o servidor já escreveu
 * `data-tema` no container e o override explícito vence os dois — sem
 * qualquer JS bloqueando o primeiro paint.
 */
function estiloAntiFlash(claro: string, escuro: string): string {
  return [
    `.guest-tema:not([data-tema="dark"]) { ${claro} }`,
    `@media (prefers-color-scheme: dark) { .guest-tema:not([data-tema="light"]) { ${escuro} } }`,
    `.guest-tema[data-tema="light"] { ${claro} }`,
    `.guest-tema[data-tema="dark"] { ${escuro} }`,
  ].join("\n");
}

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

  const claro = cssDasVars(eventVars(r.evento, "light"));
  const escuro = cssDasVars(eventVars(r.evento, "dark"));
  const prefServidor = readThemePreference((await cookies()).get(THEME_COOKIE)?.value);

  const session = await guestSession();
  const withSession = isSameEventSession(session, r.evento.eventoId);

  return (
    <div className="guest-tema" data-tema={prefServidor ?? undefined} id="guest-root">
      <style>{estiloAntiFlash(claro, escuro)}</style>
      <link rel="manifest" href={`/e/${encodeURIComponent(slug)}/manifest.webmanifest`} />
      <ThemeController preferenciaServidor={prefServidor} />
      {withSession && <GlobalQueue eventoId={session.eventoId} />}
      {children}
    </div>
  );
}
