import { buscarEventoDoHost, type EventoDoHost } from "@albora/db";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { adminEventDisplayName } from "@/features/admin/lib/event-display-name";
import { banco } from "@/lib/banco";
import { COOKIE_HOST, hostDoToken } from "@/lib/host-sessao";

export type AdminEventPageContext = {
  evento: EventoDoHost;
  eventoId: string;
  name: string;
};

export async function loadEventPage(eventoId: string): Promise<AdminEventPageContext> {
  const token = (await cookies()).get(COOKIE_HOST)?.value;
  const host = await hostDoToken(token);
  if (!host) redirect("/admin/entrar");

  const evento = await buscarEventoDoHost(banco(), host.accountId, eventoId);
  if (!evento) notFound();

  return { evento, eventoId, name: adminEventDisplayName(evento) };
}
