import type { Pool } from "pg";
import { withEvent } from "./index";
import { assinaturaValida, emitirToken, hashDoToken } from "./token";

/** Validade do magic link do convidado. Curta: é prova de posse de e-mail, não sessão. */
export const VALIDADE_GUEST_MAGIC_LINK_MINUTOS = 15;

export async function emitGuestMagicLinkRow(
  pool: Pool,
  segredo: string,
  eventId: string,
  sessionId: string,
  email: string,
  expiraEm: Date,
): Promise<{ token: string }> {
  const { token, hash } = emitirToken(segredo);
  await withEvent(pool, eventId, async (cliente) => {
    await cliente.query(
      `INSERT INTO guest_magic_links (event_id, session_id, token_hash, email, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [eventId, sessionId, hash, email.trim().toLowerCase(), expiraEm],
    );
  });
  return { token };
}

/**
 * Single-use, atômico: `UPDATE … WHERE used_at IS NULL RETURNING`. Porta de
 * entrada por `token_hash` (UNIQUE global), como `session_tokens`. Esta
 * tabela NUNCA toca `accounts` nem `host_sessions` — é só a prova de posse
 * de e-mail do convidado, escopada a evento+sessão.
 */
export async function consumeGuestMagicLink(
  pool: Pool,
  segredo: string,
  token: string,
): Promise<{ eventId: string; sessionId: string; email: string } | null> {
  if (!assinaturaValida(segredo, token)) return null;
  const hash = hashDoToken(token);
  const { rows } = await pool.query<{ event_id: string; session_id: string; email: string }>(
    `UPDATE guest_magic_links SET used_at = now()
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING event_id, session_id, email`,
    [hash],
  );
  const linha = rows[0];
  if (!linha) return null;
  return { eventId: linha.event_id, sessionId: linha.session_id, email: linha.email };
}
