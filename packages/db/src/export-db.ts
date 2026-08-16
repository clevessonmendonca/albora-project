import { ACAO_EXPORT_ACERVO, midiaExportavel, TETO_DO_EXPORT } from "@albora/core";
import type { Pool, PoolClient } from "pg";
import { comConta, comEvento } from "./event";
import { emitirToken, hashDoToken, assinaturaValida } from "./token";
import { ErroMagicLinkInvalido } from "./host-auth";

export type ItemDoExport = {
  id: string;
  chave: string;
  mime: string;
  bytes: number;
};

export type JobExport = {
  id: string;
  eventId: string;
  accountId: string;
  estado: "pronto" | "vazio" | "falhou";
  fotos: number;
  itens: ItemDoExport[];
  criadoEm: Date;
  prontoEm: Date | null;
};

export const VALIDADE_STEP_UP_MINUTOS = 15;

type LinhaJob = {
  id: string;
  event_id: string;
  account_id: string;
  state: "pronto" | "vazio" | "falhou";
  photo_count: number;
  items: ItemDoExport[];
  created_at: Date;
  ready_at: Date | null;
};

type LinhaUpload = {
  id: string;
  storage_key: string;
  mime: string;
  bytes: number;
  state: string;
};

/**
 * Emite o segundo fator da spec 009: um token de uso único, na camada de
 * conta. Não abre sessão nova — a sessão longa continua, e o export exige
 * este token além dela.
 */
export async function emitirStepUp(
  pool: Pool,
  segredo: string,
  accountId: string,
  expiraEm: Date,
): Promise<{ token: string }> {
  const { token, hash } = emitirToken(segredo);
  await pool.query(
    "INSERT INTO host_step_up (token_hash, account_id, action, expires_at) VALUES ($1, $2, $3, $4)",
    [hash, accountId, ACAO_EXPORT_ACERVO, expiraEm],
  );
  return { token };
}

/**
 * Consome o step-up. Atômico: dois cliques no mesmo link só passam uma vez.
 * A conta do token tem de ser a da sessão — senão é o token de outro anfitrião.
 */
export async function consumirStepUp(
  pool: Pool,
  segredo: string,
  token: string,
  accountId: string,
  agora: Date,
): Promise<void> {
  if (!assinaturaValida(segredo, token)) throw new ErroMagicLinkInvalido("assinatura");

  const hash = hashDoToken(token);
  const { rows } = await pool.query<{ account_id: string }>(
    `UPDATE host_step_up SET used_at = $2
      WHERE token_hash = $1 AND account_id = $4 AND used_at IS NULL AND expires_at > $2 AND action = $3
      RETURNING account_id`,
    [hash, agora, ACAO_EXPORT_ACERVO, accountId],
  );

  if (rows[0]) return;

  const { rows: atual } = await pool.query<{
    used_at: Date | null;
    expirado: boolean;
    account_id: string;
  }>(
    `SELECT used_at, (expires_at <= $2) AS expirado, account_id
       FROM host_step_up WHERE token_hash = $1`,
    [hash, agora],
  );
  const l = atual[0];
  if (!l || l.account_id !== accountId) throw new ErroMagicLinkInvalido("desconhecido");
  if (l.used_at) throw new ErroMagicLinkInvalido("ja_usado");
  throw new ErroMagicLinkInvalido("expirado");
}

export async function criarJobExport(
  pool: Pool,
  accountId: string,
  eventoId: string,
): Promise<JobExport | null> {
  const pertence = await comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query("SELECT 1 FROM events WHERE id = $1", [eventoId]);
    return (rowCount ?? 0) > 0;
  });
  if (!pertence) return null;

  return comEvento(pool, eventoId, async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`export:${eventoId}`]);
    const itens = await listarItensPublicados(c, eventoId);
    const estado = itens.length === 0 ? "vazio" : "pronto";
    const agora = new Date();

    const { rows } = await c.query<LinhaJob>(
      `INSERT INTO export_jobs (event_id, account_id, state, photo_count, items, ready_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING id, event_id, account_id, state, photo_count, items, created_at, ready_at`,
      [eventoId, accountId, estado, itens.length, JSON.stringify(itens), agora],
    );

    return deLinha(rows[0]!);
  });
}

export async function jobExportMaisRecente(
  pool: Pool,
  accountId: string,
  eventoId: string,
): Promise<JobExport | null> {
  const pertence = await comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query("SELECT 1 FROM events WHERE id = $1", [eventoId]);
    return (rowCount ?? 0) > 0;
  });
  if (!pertence) return null;

  return comEvento(pool, eventoId, async (c) => {
    const { rows } = await c.query<LinhaJob>(
      `SELECT id, event_id, account_id, state, photo_count, items, created_at, ready_at
         FROM export_jobs
        WHERE event_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 1`,
      [eventoId],
    );
    const linha = rows[0];
    return linha ? deLinha(linha) : null;
  });
}

export async function jobExportPorId(
  pool: Pool,
  accountId: string,
  eventoId: string,
  jobId: string,
): Promise<JobExport | null> {
  const pertence = await comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query("SELECT 1 FROM events WHERE id = $1", [eventoId]);
    return (rowCount ?? 0) > 0;
  });
  if (!pertence) return null;

  return comEvento(pool, eventoId, async (c) => {
    const { rows } = await c.query<LinhaJob>(
      `SELECT id, event_id, account_id, state, photo_count, items, created_at, ready_at
         FROM export_jobs
        WHERE id = $1 AND event_id = $2`,
      [jobId, eventoId],
    );
    const linha = rows[0];
    return linha ? deLinha(linha) : null;
  });
}

async function listarItensPublicados(
  cliente: PoolClient,
  eventoId: string,
): Promise<ItemDoExport[]> {
  const { rows } = await cliente.query<LinhaUpload>(
    `SELECT id, storage_key, mime, bytes, state
       FROM uploads
      WHERE event_id = $1 AND state = 'published'
      ORDER BY created_at ASC, id ASC
      LIMIT $2`,
    [eventoId, TETO_DO_EXPORT],
  );

  return rows
    .filter((l) =>
      midiaExportavel(
        { id: l.id, chave: l.storage_key, mime: l.mime, estado: l.state },
        eventoId,
      ),
    )
    .map((l) => ({ id: l.id, chave: l.storage_key, mime: l.mime, bytes: l.bytes }));
}

function deLinha(linha: LinhaJob): JobExport {
  const bruto = linha.items;
  const itens = Array.isArray(bruto) ? bruto : [];
  return {
    id: linha.id,
    eventId: linha.event_id,
    accountId: linha.account_id,
    estado: linha.state,
    fotos: linha.photo_count,
    itens,
    criadoEm: linha.created_at,
    prontoEm: linha.ready_at,
  };
}
