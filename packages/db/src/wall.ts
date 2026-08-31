import type { Pool } from "pg";
import { assinaturaValida, emitirToken, hashDoToken } from "./token";

/** Hash do token, nunca o token — dump do banco não entrega a parede de ninguém. */

export type ParedeResolvida = { eventoId: string };

export type MotivoParedeInvalida = "assinatura" | "desconhecido" | "expirado" | "revogado";

export class ErroParedeInvalida extends Error {
  constructor(readonly motivo: MotivoParedeInvalida) {
    super(`parede inválida: ${motivo}`);
    this.name = "ErroParedeInvalida";
  }
}

export async function emitirCrachaDaParede(
  pool: Pool,
  segredo: string,
  eventoId: string,
  expiraEm: Date,
): Promise<string> {
  const { token, hash } = emitirToken(segredo);

  await pool.query(
    "INSERT INTO wall_tokens (token_hash, event_id, expires_at) VALUES ($1, $2, $3)",
    [hash, eventoId, expiraEm],
  );

  return token;
}

/** Assinatura antes do banco — crachá forjado custa microssegundos, não uma consulta. */
export async function resolverParede(
  pool: Pool,
  segredo: string,
  token: string,
): Promise<ParedeResolvida> {
  if (!assinaturaValida(segredo, token)) {
    throw new ErroParedeInvalida("assinatura");
  }

  const { rows } = await pool.query<{
    event_id: string;
    expirado: boolean;
    revogado: boolean;
  }>(
    `SELECT event_id,
            (expires_at <= now())    AS expirado,
            (revoked_at IS NOT NULL) AS revogado
     FROM wall_tokens WHERE token_hash = $1`,
    [hashDoToken(token)],
  );

  const linha = rows[0];
  if (!linha) throw new ErroParedeInvalida("desconhecido");
  if (linha.revogado) throw new ErroParedeInvalida("revogado");
  if (linha.expirado) throw new ErroParedeInvalida("expirado");

  return { eventoId: linha.event_id };
}

/** Revoga só a parede; sessões dos convidados continuam intactas. */
export async function revogarParedesDoEvento(pool: Pool, eventoId: string): Promise<number> {
  const { rowCount } = await pool.query(
    "UPDATE wall_tokens SET revoked_at = now() WHERE event_id = $1 AND revoked_at IS NULL",
    [eventoId],
  );

  return rowCount ?? 0;
}
