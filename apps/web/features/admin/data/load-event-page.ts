import { buscarEventoDoHost, type EventoDoHost } from "@albora/db";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { adminEventDisplayName } from "@/features/admin/lib/event-display-name";
import { getPool } from "@/lib/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";

export type AdminEventPageContext = {
  evento: EventoDoHost;
  eventoId: string;
  name: string;
};

export async function loadEventPage(eventoId: string): Promise<AdminEventPageContext> {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in");

  const evento = await buscarEventoDoHost(getPool(), host.accountId, eventoId);
  if (!evento) notFound();

  return { evento, eventoId, name: adminEventDisplayName(evento) };
}
