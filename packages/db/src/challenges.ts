import type { PoolClient } from "pg";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CUSTOM_TITLE_MAX = 120;

export type Desafio = {
  id: string;
  /** Chave de vocabulário do pack. Null para missões personalizadas. */
  chaveTitulo: string | null;
  /** Texto livre do casal. Null para missões do pack. */
  tituloCustom: string | null;
  /** Emoji opcional nas missões personalizadas. */
  emoji: string | null;
  ordem: number;
  /** Se **esta** sessão já mandou foto para ele. */
  feito: boolean;
};

export async function listarDesafios(
  cliente: PoolClient,
  eventoId: string,
  sessaoId: string | null,
): Promise<Desafio[]> {
  const { rows } = await cliente.query<{
    id: string;
    title_key: string | null;
    custom_title: string | null;
    emoji: string | null;
    position: number;
    feito: boolean;
  }>(
    `SELECT c.id, c.title_key, c.custom_title, c.emoji, c.position,
            EXISTS (
              SELECT 1 FROM uploads u
              WHERE u.challenge_id = c.id AND u.session_id = $2
            ) AS feito
     FROM challenges c
     WHERE c.event_id = $1
     ORDER BY c.position`,
    [eventoId, sessaoId],
  );

  return rows.map((l) => ({
    id: l.id,
    chaveTitulo: l.title_key,
    tituloCustom: l.custom_title,
    emoji: l.emoji,
    ordem: l.position,
    feito: l.feito,
  }));
}

export async function desafioDoEvento(
  cliente: PoolClient,
  eventoId: string,
  desafioId: string,
): Promise<boolean> {
  if (!UUID.test(desafioId)) return false;

  const { rowCount } = await cliente.query(
    "SELECT 1 FROM challenges WHERE id = $1 AND event_id = $2",
    [desafioId, eventoId],
  );

  return (rowCount ?? 0) > 0;
}

export type ItemMissao =
  | { tipo: "pack"; chave: string }
  | { tipo: "custom"; id?: string; titulo: string; emoji?: string | null };

/**
 * Troca o conjunto completo de missões (pack + personalizadas) na ordem recebida.
 *
 * Missões do pack: mantêm o id quando a chave permanece.
 * Missões personalizadas: mantêm o id quando o id já existe; criam nova linha caso contrário.
 */
export async function substituirDesafios(
  cliente: PoolClient,
  eventoId: string,
  chaves: readonly string[],
): Promise<Desafio[]> {
  if (chaves.some((k) => typeof k !== "string" || k.length === 0)) {
    throw new Error("missão inválida");
  }
  if (new Set(chaves).size !== chaves.length) {
    throw new Error("missões duplicadas");
  }

  const { rows: atuais } = await cliente.query<{ id: string; title_key: string | null }>(
    "SELECT id, title_key FROM challenges WHERE event_id = $1 AND title_key IS NOT NULL",
    [eventoId],
  );
  const porChave = new Map(atuais.map((l) => [l.title_key!, l.id]));
  const manter = new Set<string>();

  for (const [i, chave] of chaves.entries()) {
    const existente = porChave.get(chave);
    const posicao = i + 1;
    if (existente) {
      await cliente.query(
        "UPDATE challenges SET position = $1 WHERE id = $2 AND event_id = $3",
        [posicao, existente, eventoId],
      );
      manter.add(existente);
    } else {
      const { rows } = await cliente.query<{ id: string }>(
        "INSERT INTO challenges (event_id, title_key, position) VALUES ($1, $2, $3) RETURNING id",
        [eventoId, chave, posicao],
      );
      manter.add(rows[0]!.id);
    }
  }

  if (manter.size === 0) {
    await cliente.query(
      "DELETE FROM challenges WHERE event_id = $1 AND title_key IS NOT NULL",
      [eventoId],
    );
  } else {
    await cliente.query(
      "DELETE FROM challenges WHERE event_id = $1 AND title_key IS NOT NULL AND NOT (id = ANY($2::uuid[]))",
      [eventoId, [...manter]],
    );
  }

  return listarDesafios(cliente, eventoId, null);
}

/** Substitui as missões personalizadas do evento preservando as do pack. */
export async function substituirMissoesCustom(
  cliente: PoolClient,
  eventoId: string,
  itens: readonly { id?: string; titulo: string; posicao: number; emoji?: string | null }[],
): Promise<Desafio[]> {
  for (const item of itens) {
    const titulo = item.titulo.trim();
    if (!titulo || titulo.length > CUSTOM_TITLE_MAX) {
      throw new Error(`título inválido: "${item.titulo.slice(0, 30)}"`);
    }
  }

  const { rows: atuais } = await cliente.query<{ id: string }>(
    "SELECT id FROM challenges WHERE event_id = $1 AND custom_title IS NOT NULL",
    [eventoId],
  );
  const idsExistentes = new Set(atuais.map((r) => r.id));
  const manter = new Set<string>();

  for (const item of itens) {
    const titulo = item.titulo.trim();
    const emoji = item.emoji?.trim() || null;
    if (item.id && UUID.test(item.id) && idsExistentes.has(item.id)) {
      await cliente.query(
        "UPDATE challenges SET custom_title = $1, position = $2, emoji = $3 WHERE id = $4 AND event_id = $5",
        [titulo, item.posicao, emoji, item.id, eventoId],
      );
      manter.add(item.id);
    } else {
      const { rows } = await cliente.query<{ id: string }>(
        "INSERT INTO challenges (event_id, custom_title, position, emoji) VALUES ($1, $2, $3, $4) RETURNING id",
        [eventoId, titulo, item.posicao, emoji],
      );
      manter.add(rows[0]!.id);
    }
  }

  if (manter.size === 0) {
    await cliente.query(
      "DELETE FROM challenges WHERE event_id = $1 AND custom_title IS NOT NULL",
      [eventoId],
    );
  } else {
    await cliente.query(
      "DELETE FROM challenges WHERE event_id = $1 AND custom_title IS NOT NULL AND NOT (id = ANY($2::uuid[]))",
      [eventoId, [...manter]],
    );
  }

  return listarDesafios(cliente, eventoId, null);
}
