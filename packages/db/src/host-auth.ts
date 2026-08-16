import type { Pool } from "pg";
import { assinaturaValida, emitirToken, hashDoToken } from "./token";

/**
 * O login do anfitrião por magic link (spec 009).
 *
 * Duas credenciais, e a mesma disciplina do resto do produto: guarda o hash,
 * nunca o token. O magic link é de uso único e vida curta; a sessão de host
 * dura mais e é revogável. Ambas vivem na camada de conta, acima do evento —
 * resolvem `account_id`, nunca leem dado de evento.
 */

/** Validade do magic link. Curta: é um link de e-mail, não uma sessão. */
export const VALIDADE_MAGIC_LINK_MINUTOS = 15;
/** Validade da sessão de host depois de consumir o link. */
export const VALIDADE_HOST_SESSAO_HORAS = 12;

export type MagicLinkEmitido = { token: string; accountId: string; isNewAccount: boolean };
export type HostSessaoCriada = { token: string; accountId: string };
export type HostResolvida = { accountId: string; email: string };

export type MotivoMagicLinkInvalido = "assinatura" | "desconhecido" | "expirado" | "ja_usado";

export class ErroMagicLinkInvalido extends Error {
  constructor(readonly motivo: MotivoMagicLinkInvalido) {
    super(`magic link inválido: ${motivo}`);
    this.name = "ErroMagicLinkInvalido";
  }
}

export class ErroHostSessaoInvalida extends Error {
  constructor(readonly motivo: "assinatura" | "desconhecida" | "expirada" | "revogada") {
    super(`sessão de host inválida: ${motivo}`);
    this.name = "ErroHostSessaoInvalida";
  }
}

/**
 * Emite um magic link para um e-mail, criando a conta se ela ainda não existe.
 *
 * Devolve o token para quem chama montar o link e **entregá-lo por e-mail** — em
 * produção, o único canal. Nunca devolver o link na resposta a um POST anônimo
 * seria dar login de qualquer conta a qualquer um; quem expõe o link é a rota,
 * e só em dev.
 */
export async function emitirMagicLink(
  pool: Pool,
  segredo: string,
  email: string,
  expiraEm: Date,
): Promise<MagicLinkEmitido> {
  const normalizado = email.trim().toLowerCase();

  const antes = await pool.query<{ id: string }>(
    "SELECT id FROM accounts WHERE email = $1",
    [normalizado],
  );
  const jaExistia = antes.rows.length > 0;

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO accounts (email) VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [normalizado],
  );
  const accountId = rows[0]!.id;

  const { token, hash } = emitirToken(segredo);
  await pool.query(
    "INSERT INTO magic_links (token_hash, account_id, expires_at) VALUES ($1, $2, $3)",
    [hash, accountId, expiraEm],
  );

  return { token, accountId, isNewAccount: !jaExistia };
}

/**
 * Consome o magic link e abre uma sessão de host.
 *
 * 🔴 Uso único, atômico: o `UPDATE ... WHERE used_at IS NULL RETURNING` garante
 * que dois cliques no mesmo link só produzem uma sessão. Assinatura primeiro,
 * banco depois, pelo mesmo motivo da sessão do convidado.
 */
export async function consumirMagicLink(
  pool: Pool,
  segredo: string,
  token: string,
  expiraSessaoEm: Date,
  agora: Date,
): Promise<HostSessaoCriada> {
  if (!assinaturaValida(segredo, token)) throw new ErroMagicLinkInvalido("assinatura");

  const hash = hashDoToken(token);
  const { rows } = await pool.query<{ account_id: string }>(
    `UPDATE magic_links SET used_at = $2
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > $2
      RETURNING account_id`,
    [hash, agora],
  );

  const linha = rows[0];
  if (!linha) {
    const { rows: atual } = await pool.query<{ used_at: Date | null; expirado: boolean }>(
      "SELECT used_at, (expires_at <= $2) AS expirado FROM magic_links WHERE token_hash = $1",
      [hash, agora],
    );
    const l = atual[0];
    if (!l) throw new ErroMagicLinkInvalido("desconhecido");
    if (l.used_at) throw new ErroMagicLinkInvalido("ja_usado");
    throw new ErroMagicLinkInvalido("expirado");
  }

  const { token: sessaoToken, hash: sessaoHash } = emitirToken(segredo);
  await pool.query(
    "INSERT INTO host_sessions (token_hash, account_id, expires_at) VALUES ($1, $2, $3)",
    [sessaoHash, linha.account_id, expiraSessaoEm],
  );

  return { token: sessaoToken, accountId: linha.account_id };
}

/**
 * Resolve a sessão de host. Assinatura primeiro, banco depois. Junta o e-mail da
 * conta para o painel — nunca dado de evento, que é de outra camada.
 */
export async function resolverHostSessao(
  pool: Pool,
  segredo: string,
  token: string,
): Promise<HostResolvida> {
  if (!assinaturaValida(segredo, token)) throw new ErroHostSessaoInvalida("assinatura");

  const { rows } = await pool.query<{
    account_id: string;
    email: string;
    expirado: boolean;
    revogado: boolean;
  }>(
    `SELECT h.account_id, a.email,
            (h.expires_at <= now()) AS expirado,
            (h.revoked_at IS NOT NULL) AS revogado
       FROM host_sessions h JOIN accounts a ON a.id = h.account_id
      WHERE h.token_hash = $1`,
    [hashDoToken(token)],
  );

  const linha = rows[0];
  if (!linha) throw new ErroHostSessaoInvalida("desconhecida");
  if (linha.revogado) throw new ErroHostSessaoInvalida("revogada");
  if (linha.expirado) throw new ErroHostSessaoInvalida("expirada");

  return { accountId: linha.account_id, email: linha.email };
}

/** Revoga uma sessão de host — o botão "sair". */
export async function revogarHostSessao(pool: Pool, segredo: string, token: string): Promise<void> {
  if (!assinaturaValida(segredo, token)) return;
  await pool.query(
    "UPDATE host_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
    [hashDoToken(token)],
  );
}
