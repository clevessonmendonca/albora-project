import { ACAO_EXPORT_ACERVO, midiaExportavel, TETO_DO_EXPORT, type EstadoDoExport } from "@albora/core";
import type { Pool, PoolClient } from "pg";
import { comConta, comEvento } from "./event";
import { emitirToken, hashDoToken, assinaturaValida } from "./token";
import { ErroMagicLinkInvalido } from "./host-auth";
import { listarMidiaDoAlbum, janelaDoAlbum } from "./album-db";
import { packDoEvento } from "./events";

export type ItemDoExport = {
  id: string;
  chave: string;
  mime: string;
  bytes: number;
  /** Só quando `destino === 'drive'` — ausente até o upload confirmar (spec §3.2). */
  driveFileId?: string;
  uploadedAt?: string;
};

export type JobExport = {
  id: string;
  eventId: string;
  accountId: string;
  estado: EstadoDoExport;
  modo: "full" | "curated";
  destino: "zip" | "drive";
  driveFolderId: string | null;
  bytesTotal: number;
  bytesEnviados: number;
  /** COUNT(*) de `uploads` published no instante em que o job nasceu — o que o gate do D365 usa para confirmar cobertura (packages/core/src/retention.ts). */
  publishedSnapshot: number;
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
  state: EstadoDoExport;
  mode: "full" | "curated" | null;
  destination: "zip" | "drive";
  drive_folder_id: string | null;
  bytes_total: string | number;
  bytes_uploaded: string | number;
  published_snapshot: number | null;
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

/** Token de segundo fator — uso único. Não abre sessão nova; a sessão longa continua, o export exige este além dela. */
export async function emitirStepUp(
  pool: Pool,
  segredo: string,
  accountId: string,
  expiraEm: Date,
  acao: string = ACAO_EXPORT_ACERVO,
): Promise<{ token: string }> {
  const { token, hash } = emitirToken(segredo);
  await pool.query(
    "INSERT INTO host_step_up (token_hash, account_id, action, expires_at) VALUES ($1, $2, $3, $4)",
    [hash, accountId, acao, expiraEm],
  );
  return { token };
}

/** 🔴 Atômico (UPDATE RETURNING); account_id do token deve bater com o da sessão; acao distingue ZIP de Drive. */
export async function consumirStepUp(
  pool: Pool,
  segredo: string,
  token: string,
  accountId: string,
  agora: Date,
  acao: string = ACAO_EXPORT_ACERVO,
): Promise<void> {
  if (!assinaturaValida(segredo, token)) throw new ErroMagicLinkInvalido("assinatura");

  const hash = hashDoToken(token);
  const { rows } = await pool.query<{ account_id: string }>(
    `UPDATE host_step_up SET used_at = $2
      WHERE token_hash = $1 AND account_id = $4 AND used_at IS NULL AND expires_at > $2 AND action = $3
      RETURNING account_id`,
    [hash, agora, acao, accountId],
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
  opts?: { curated?: boolean; curatedIds?: string[] },
): Promise<JobExport | null> {
  const pertence = await comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query("SELECT 1 FROM events WHERE id = $1", [eventoId]);
    return (rowCount ?? 0) > 0;
  });
  if (!pertence) return null;

  return comEvento(pool, eventoId, async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`export:${eventoId}`]);
    const modo: "full" | "curated" = opts?.curated ? "curated" : "full";
    const itens = opts?.curated && opts.curatedIds
      ? await listarItensFiltrados(c, eventoId, opts.curatedIds)
      : await listarItensPublicados(c, eventoId);
    const estado: EstadoDoExport = itens.length === 0 ? "vazio" : "pronto";
    const agora = new Date();

    const { rows } = await c.query<LinhaJob>(
      `INSERT INTO export_jobs (event_id, account_id, state, mode, destination, published_snapshot, photo_count, items, ready_at)
       VALUES ($1, $2, $3, $4, 'zip', $5, $6, $7::jsonb, $8)
       RETURNING id, event_id, account_id, state, mode, destination, drive_folder_id, bytes_total, bytes_uploaded, published_snapshot, photo_count, items, created_at, ready_at`,
      [eventoId, accountId, estado, modo, itens.length, itens.length, JSON.stringify(itens), agora],
    );

    return deLinha(rows[0]!);
  });
}

/** Grava o job apenas — nunca fala com o Drive; upload item a item acontece depois em avancarExportDrive. */
export async function criarJobExportDrive(
  pool: Pool,
  accountId: string,
  eventoId: string,
  driveFolderId: string,
): Promise<JobExport | null> {
  const pertence = await comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query("SELECT 1 FROM events WHERE id = $1", [eventoId]);
    return (rowCount ?? 0) > 0;
  });
  if (!pertence) return null;

  return comEvento(pool, eventoId, async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`export:${eventoId}`]);
    const itens = await listarItensPublicados(c, eventoId);
    const bytesTotal = itens.reduce((soma, i) => soma + i.bytes, 0);
    const estado: EstadoDoExport = itens.length === 0 ? "vazio" : "enviando";
    const agora = new Date();

    const { rows } = await c.query<LinhaJob>(
      `INSERT INTO export_jobs
         (event_id, account_id, state, mode, destination, drive_folder_id, bytes_total, published_snapshot, photo_count, items, ready_at)
       VALUES ($1, $2, $3, 'full', 'drive', $4, $5, $6, $7, $8::jsonb, $9)
       RETURNING id, event_id, account_id, state, mode, destination, drive_folder_id, bytes_total, bytes_uploaded, published_snapshot, photo_count, items, created_at, ready_at`,
      [
        eventoId,
        accountId,
        estado,
        driveFolderId,
        bytesTotal,
        itens.length,
        itens.length,
        JSON.stringify(itens),
        estado === "vazio" ? agora : null,
      ],
    );

    return deLinha(rows[0]!);
  });
}

/** Um item por vez — falha no meio não descarta o que já subiu. */
export async function marcarItemDriveEnviado(
  pool: Pool,
  eventoId: string,
  jobId: string,
  itemId: string,
  driveFileId: string,
): Promise<void> {
  await comEvento(pool, eventoId, async (c) => {
    const { rows } = await c.query<{ items: ItemDoExport[] }>(
      "SELECT items FROM export_jobs WHERE id = $1 AND event_id = $2",
      [jobId, eventoId],
    );
    const linha = rows[0];
    if (!linha) return;

    const alvo = linha.items.find((i) => i.id === itemId);
    if (!alvo || alvo.uploadedAt) return; // já marcado — idempotente contra retomada

    const agora = new Date().toISOString();
    const itens = linha.items.map((i) =>
      i.id === itemId ? { ...i, driveFileId, uploadedAt: agora } : i,
    );

    await c.query(
      `UPDATE export_jobs
          SET items = $3::jsonb, bytes_uploaded = bytes_uploaded + $4
        WHERE id = $1 AND event_id = $2`,
      [jobId, eventoId, JSON.stringify(itens), alvo.bytes],
    );
  });
}

/** Fecha o job de Drive — `pronto` só quando cobriu tudo; `parcial` senão (nunca conta para o gate do D365). */
export async function finalizarExportDrive(
  pool: Pool,
  eventoId: string,
  jobId: string,
  estado: "pronto" | "parcial",
): Promise<void> {
  await comEvento(pool, eventoId, (c) =>
    c.query(
      "UPDATE export_jobs SET state = $3, ready_at = now() WHERE id = $1 AND event_id = $2",
      [jobId, eventoId, estado],
    ),
  );
}

export type JobDriveEnviando = {
  eventId: string;
  jobId: string;
  accountId: string;
};

/** Lista jobs cross-event — runner usa papel BYPASSRLS (como retenção). */
export async function listarJobsDriveEnviando(pool: Pool, limite = 10): Promise<JobDriveEnviando[]> {
  const { rows } = await pool.query<{ event_id: string; id: string; account_id: string }>(
    `SELECT event_id, id, account_id
       FROM export_jobs
      WHERE destination = 'drive' AND state = 'enviando'
      ORDER BY created_at ASC
      LIMIT $1`,
    [limite],
  );
  return rows.map((r) => ({ eventId: r.event_id, jobId: r.id, accountId: r.account_id }));
}

/** Retoma um job parcial sem criar duplicata — o POST do admin chama isto. */
export async function retomarExportDrive(pool: Pool, eventoId: string, jobId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE export_jobs
        SET state = 'enviando', ready_at = NULL
      WHERE id = $1 AND event_id = $2 AND destination = 'drive' AND state = 'parcial'`,
    [jobId, eventoId],
  );
  return (rowCount ?? 0) > 0;
}

/** Estimativa antes de criar o job (spec §5.1) — quota se confere ANTES de qualquer INSERT. */
export async function previaExportDrive(
  pool: Pool,
  accountId: string,
  eventoId: string,
): Promise<{ fotos: number; bytesTotal: number } | null> {
  const pertence = await comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query("SELECT 1 FROM events WHERE id = $1", [eventoId]);
    return (rowCount ?? 0) > 0;
  });
  if (!pertence) return null;

  return comEvento(pool, eventoId, async (c) => {
    const itens = await listarItensPublicados(c, eventoId);
    return { fotos: itens.length, bytesTotal: itens.reduce((soma, i) => soma + i.bytes, 0) };
  });
}

export async function jobExportDriveMaisRecente(
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
      `SELECT id, event_id, account_id, state, mode, destination, drive_folder_id, bytes_total, bytes_uploaded, published_snapshot, photo_count, items, created_at, ready_at
         FROM export_jobs
        WHERE event_id = $1 AND destination = 'drive'
        ORDER BY created_at DESC, id DESC
        LIMIT 1`,
      [eventoId],
    );
    const linha = rows[0];
    return linha ? deLinha(linha) : null;
  });
}

export async function midiaParaCuradoria(pool: Pool, eventoId: string) {
  return comEvento(pool, eventoId, async (c) => {
    const midias = await listarMidiaDoAlbum(c, eventoId);
    const janela = await janelaDoAlbum(c, eventoId);
    const packId = await packDoEvento(c, eventoId);
    return { midias, janela, packId };
  });
}

export async function jobExportMaisRecente(
  pool: Pool,
  accountId: string,
  eventoId: string,
  modo?: "full" | "curated",
): Promise<JobExport | null> {
  const pertence = await comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query("SELECT 1 FROM events WHERE id = $1", [eventoId]);
    return (rowCount ?? 0) > 0;
  });
  if (!pertence) return null;

  return comEvento(pool, eventoId, async (c) => {
    const where = modo ? "WHERE event_id = $1 AND mode = $2" : "WHERE event_id = $1";
    const params = modo ? [eventoId, modo] : [eventoId];
    const { rows } = await c.query<LinhaJob>(
      `SELECT id, event_id, account_id, state, mode, destination, drive_folder_id, bytes_total, bytes_uploaded, published_snapshot, photo_count, items, created_at, ready_at
         FROM export_jobs
        ${where}
        ORDER BY created_at DESC, id DESC
        LIMIT 1`,
      params,
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
      `SELECT id, event_id, account_id, state, mode, destination, drive_folder_id, bytes_total, bytes_uploaded, published_snapshot, photo_count, items, created_at, ready_at
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

async function listarItensFiltrados(
  cliente: PoolClient,
  eventoId: string,
  uploadIds: string[],
): Promise<ItemDoExport[]> {
  if (uploadIds.length === 0) return [];

  const { rows } = await cliente.query<LinhaUpload>(
    `SELECT id, storage_key, mime, bytes, state
       FROM uploads
      WHERE event_id = $1 AND state = 'published' AND id = ANY($2)
      ORDER BY created_at ASC, id ASC
      LIMIT $3`,
    [eventoId, uploadIds, TETO_DO_EXPORT],
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
    modo: linha.mode ?? "full",
    destino: linha.destination ?? "zip",
    driveFolderId: linha.drive_folder_id,
    bytesTotal: Number(linha.bytes_total ?? 0),
    bytesEnviados: Number(linha.bytes_uploaded ?? 0),
    publishedSnapshot: linha.published_snapshot ?? 0,
    fotos: linha.photo_count,
    itens,
    criadoEm: linha.created_at,
    prontoEm: linha.ready_at,
  };
}
