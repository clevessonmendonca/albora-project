import type { Pool } from "pg";
import { isGuestSessionLive, withEvent } from "@albora/db";

export type ClaimGuestPhotosByEmailInput = {
  eventId: string;
  guestSessionId: string;
  email: string;
};

/**
 * BLINDADO (ADR 0018, Decisão 2): NUNCA cria conta de anfitrião, NUNCA
 * emite cookie ou sessão de anfitrião, NUNCA cruza eventos. Revalida a
 * `guest_session` no servidor (eventId + guestSessionId vêm do `state`
 * assinado do OIDC, nunca do cliente) e, só se ela estiver viva,
 * grava/confirma um contato VERIFICADO na MESMA sessão — o convidado
 * continua anônimo depois disso. Sessão morta é um no-op silencioso:
 * best-effort, não deveria derrubar o login (o Google já autenticou o
 * convidado; isto só tenta religar as fotos a um e-mail, não decide se o
 * login "funcionou").
 */
export async function claimGuestPhotosByEmail(pool: Pool, input: ClaimGuestPhotosByEmailInput): Promise<void> {
  const vivo = await isGuestSessionLive(pool, input.eventId, input.guestSessionId);
  if (!vivo) return;

  const email = input.email.trim().toLowerCase();

  await withEvent(pool, input.eventId, async (cliente) => {
    // guest_contacts não tem UNIQUE(event_id, session_id, channel, value) — idempotência por SELECT-then-INSERT dentro da mesma transação.
    const { rows: existente } = await cliente.query<{ id: string }>(
      `SELECT id FROM guest_contacts
        WHERE event_id = $1 AND session_id = $2 AND channel = 'email' AND value = $3`,
      [input.eventId, input.guestSessionId, email],
    );

    if (existente.length > 0) {
      await cliente.query(
        `UPDATE guest_contacts SET verified_at = now(), verified_via = 'google' WHERE id = $1`,
        [existente[0]!.id],
      );
      return;
    }

    await cliente.query(
      `INSERT INTO guest_contacts (event_id, session_id, channel, value, verified_at, verified_via)
       VALUES ($1, $2, 'email', $3, now(), 'google')`,
      [input.eventId, input.guestSessionId, email],
    );
  });
}
