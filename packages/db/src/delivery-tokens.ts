import type { Pool } from "pg";
import { withEvent } from "./index";
import { assinaturaValida, emitirToken, hashDoToken } from "./token";

export class ErroTokenDeEntrega extends Error {
  constructor() {
    super("token de entrega inválido");
    this.name = "ErroTokenDeEntrega";
  }
}

export async function issueDeliveryToken(
  pool: Pool,
  segredo: string,
  eventId: string,
  sessionId: string,
  expiraEm: Date,
): Promise<{ token: string }> {
  const { token, hash } = emitirToken(segredo);
  await withEvent(pool, eventId, async (cliente) => {
    await cliente.query(
      `INSERT INTO delivery_tokens (event_id, session_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [eventId, sessionId, hash, expiraEm],
    );
  });
  return { token };
}

/** Porta de entrada: resolve token → event_id antes de haver contexto, como `resolverSessao`. Assinatura antes do banco. */
export async function resolveDeliveryToken(
  pool: Pool,
  segredo: string,
  token: string,
): Promise<{ eventId: string; sessionId: string }> {
  if (!assinaturaValida(segredo, token)) throw new ErroTokenDeEntrega();
  const hash = hashDoToken(token);
  const { rows } = await pool.query<{ event_id: string; session_id: string }>(
    `SELECT event_id, session_id FROM delivery_tokens
      WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [hash],
  );
  if (rows.length === 0) throw new ErroTokenDeEntrega();
  return { eventId: rows[0]!.event_id, sessionId: rows[0]!.session_id };
}
