import type { Pool } from "pg";
import { issueDeliveryToken, withEvent } from "@albora/db";
import { resolveDeliveries } from "./resolve-deliveries";

const TTL_DIAS_PADRAO = 30;

export type EntregaDeps = {
  pool: Pool;
  segredo: string;
  baseUrl: string;
  ttlDias?: number;
  sendEmail: (m: { to: string; subject: string; text: string }) => Promise<{ enviado: boolean }>;
};

/**
 * Emite o token de entrega, envia o link por e-mail e só marca
 * `delivered_at` quando o envio de fato aconteceu — um `sendEmail` que
 * degrada (`enviado:false`) deixa o contato pendente para o próximo run,
 * em vez de dar a entrega como feita.
 */
export async function sendGuestDelivery(
  deps: EntregaDeps,
  { eventId, sessionId, email }: { eventId: string; sessionId: string; email: string },
): Promise<{ enviado: boolean }> {
  const ttlDias = deps.ttlDias ?? TTL_DIAS_PADRAO;
  const expiraEm = new Date(Date.now() + ttlDias * 24 * 60 * 60 * 1000);

  const { token } = await issueDeliveryToken(deps.pool, deps.segredo, eventId, sessionId, expiraEm);
  const link = `${deps.baseUrl}/g/${token}`;

  const { enviado } = await deps.sendEmail({
    to: email,
    subject: "Suas fotos estão prontas",
    text: `As fotos do evento estão prontas. Veja e baixe em: ${link}`,
  });

  if (enviado) {
    await withEvent(deps.pool, eventId, async (cliente) => {
      await cliente.query(
        `UPDATE guest_contacts SET delivered_at = now()
          WHERE event_id = $1 AND session_id = $2 AND value = $3 AND channel = 'email'`,
        [eventId, sessionId, email],
      );
    });
  }

  return { enviado };
}

/**
 * Roda a entrega para todo mundo pronto no evento. Um destinatário que
 * lança (Resend fora do ar, token corrompido) não pode abortar os outros —
 * cada envio é isolado no seu próprio try/catch.
 */
export async function runDeliveryForEvent(
  deps: EntregaDeps,
  eventId: string,
): Promise<{ enviados: number; pendentes: number }> {
  const destinatarios = await resolveDeliveries(deps.pool, eventId);

  let enviados = 0;
  let pendentes = 0;

  for (const { sessionId, email } of destinatarios) {
    try {
      const { enviado } = await sendGuestDelivery(deps, { eventId, sessionId, email });
      if (enviado) enviados++;
      else pendentes++;
    } catch {
      pendentes++;
    }
  }

  return { enviados, pendentes };
}
