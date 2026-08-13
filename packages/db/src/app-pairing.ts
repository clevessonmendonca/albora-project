import type { Pool } from "pg";
import { emitirToken, hashDoToken } from "./token";

/**
 * Pareamento web → app (spec A-11).
 *
 * A sessao ja existe na web. Ela gera um codigo curto; o app digita e recebe
 * um token opaco para a mesma sessao e o mesmo evento — nao cria conta nova.
 */

const TAMANHO_CODIGO = 4;
const MAX_TENTATIVAS_DE_CODIGO = 8;

export type CodigoPareamentoApp = {
  code: string;
  expiraEm: Date;
};

export type SessaoResgatada = {
  token: string;
  eventoId: string;
  sessaoId: string;
  slug: string;
};

export type MotivoResgateInvalido = "desconhecido" | "expirado" | "ja_usado";

export class ErroResgateDePareamento extends Error {
  constructor(readonly motivo: MotivoResgateInvalido) {
    super(`resgate de pareamento inválido: ${motivo}`);
    this.name = "ErroResgateDePareamento";
  }
}

function gerarCodigoNumerico(rand: () => number): string {
  const max = 10 ** TAMANHO_CODIGO;
  const n = Math.floor(rand() * max);
  return String(n).padStart(TAMANHO_CODIGO, "0");
}

function ehColisaoDeChave(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

/**
 * Abre ou renova o codigo de pareamento para a sessao da web.
 *
 * Cancela pendentes anteriores da mesma sessao — so um codigo vivo por vez.
 */
export async function criarCodigoPareamentoApp(
  pool: Pool,
  eventoId: string,
  sessaoId: string,
  expiraEm: Date,
  rand: () => number = Math.random,
): Promise<CodigoPareamentoApp> {
  await pool.query(
    `UPDATE app_pairings SET status = 'cancelado'
      WHERE session_id = $1 AND status = 'pendente'`,
    [sessaoId],
  );

  for (let tentativa = 0; tentativa < MAX_TENTATIVAS_DE_CODIGO; tentativa++) {
    const code = gerarCodigoNumerico(rand);
    try {
      await pool.query(
        `INSERT INTO app_pairings (code, event_id, session_id, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [code, eventoId, sessaoId, expiraEm],
      );
      return { code, expiraEm };
    } catch (e) {
      if (ehColisaoDeChave(e)) continue;
      throw e;
    }
  }
  throw new Error("não foi possível gerar um código de pareamento livre");
}

/**
 * O app resgata o codigo e recebe um token novo para a sessao existente.
 *
 * Consome o codigo de uma vez — dois resgates simultaneos nao emitem dois
 * tokens: so um `UPDATE ... RETURNING` casa com `status = 'pendente'`.
 */
export async function resgatarCodigoPareamentoApp(
  pool: Pool,
  segredo: string,
  code: string,
  duracaoHoras: number,
  agora: Date,
): Promise<SessaoResgatada> {
  const { rows } = await pool.query<{ event_id: string; session_id: string }>(
    `UPDATE app_pairings
        SET status = 'consumido'
      WHERE code = $1 AND status = 'pendente' AND expires_at > $2
      RETURNING event_id, session_id`,
    [code, agora],
  );

  const consumido = rows[0];
  if (consumido) {
    const { token } = emitirToken(segredo);
    await pool.query(
      `INSERT INTO session_tokens (token_hash, event_id, session_id, expires_at)
       VALUES ($1, $2, $3, now() + make_interval(hours => $4))`,
      [hashDoToken(token), consumido.event_id, consumido.session_id, duracaoHoras],
    );

    const { rows: slugs } = await pool.query<{ slug: string }>(
      `SELECT slug FROM event_slugs
        WHERE event_id = $1 AND active = true
        ORDER BY created_at DESC LIMIT 1`,
      [consumido.event_id],
    );
    const slug = slugs[0]?.slug;
    if (!slug) throw new Error("evento sem slug ativo");

    return {
      token,
      eventoId: consumido.event_id,
      sessaoId: consumido.session_id,
      slug,
    };
  }

  const { rows: atual } = await pool.query<{ status: string }>(
    "SELECT status FROM app_pairings WHERE code = $1",
    [code],
  );
  const linha = atual[0];
  if (!linha) throw new ErroResgateDePareamento("desconhecido");
  if (linha.status !== "pendente") throw new ErroResgateDePareamento("ja_usado");
  throw new ErroResgateDePareamento("expirado");
}
