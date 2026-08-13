import type { Pool } from "pg";
import { assinaturaValida, emitirToken, hashDoToken } from "./token";

/**
 * O crachá da parede, do lado do banco.
 *
 * Guarda o **hash**, nunca o token — mesma disciplina de `session_tokens`. Um
 * dump do banco não entrega a parede de ninguém: o token só existe na URL que
 * o anfitrião abriu na TV.
 */

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

/**
 * Resolve o crachá apresentado pela TV.
 *
 * Assinatura primeiro, banco depois, pelo mesmo motivo de `resolverSessao`:
 * crachá forjado custa microssegundos em vez de uma consulta.
 */
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

/**
 * Derruba a parede de um evento sem tocar em outro, e sem tocar nas sessões.
 *
 * É o cabo saindo da TV no meio da festa: os convidados continuam subindo
 * foto, e a parede para.
 */
export async function revogarParedesDoEvento(pool: Pool, eventoId: string): Promise<number> {
  const { rowCount } = await pool.query(
    "UPDATE wall_tokens SET revoked_at = now() WHERE event_id = $1 AND revoked_at IS NULL",
    [eventoId],
  );

  return rowCount ?? 0;
}
