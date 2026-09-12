import { buscarEventoDoHost, roleForAccountOnEvent, type EventoDoHost, type HostEventRole } from "@albora/db";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { adminEventDisplayName } from "@/features/admin/lib/event-display-name";
import { preEventStorageKey } from "@/features/admin/lib/pre-event-checklist";
import { getPool } from "@/lib/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";

export type AdminEventPageContext = {
  evento: EventoDoHost;
  eventoId: string;
  name: string;
  role: HostEventRole;
  /** ZIP, Assinar Completo, haMenores — só couple/owner. */
  canManageCoupleOnly: boolean;
  checklistStorageKey: string;
};

export async function loadEventPage(eventoId: string): Promise<AdminEventPageContext> {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in");

  const pool = getPool();
  const role = await roleForAccountOnEvent(pool, host.accountId, eventoId);
  if (!role) notFound();

  const evento = await buscarEventoDoHost(pool, host.accountId, eventoId);
  if (!evento) notFound();

  return {
    evento,
    eventoId,
    name: adminEventDisplayName(evento),
    role,
    canManageCoupleOnly: role === "owner" || role === "couple",
    checklistStorageKey: preEventStorageKey(host.accountId, eventoId),
  };
}
