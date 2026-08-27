import type { PoolClient } from "pg";

export type MissaoInsight = {
  challengeId: string;
  titleKey: string | null;
  customTitle: string | null;
  emoji: string | null;
  fotos: number;
};

export type HoraInsight = {
  hora: number;
  fotos: number;
};

/**
 * Contagem de fotos por missão para o evento.
 * Inclui apenas missões que têm ao menos uma foto.
 * Agrega sem expor dados individuais de convidado.
 */
export async function fotosPorMissao(
  cliente: PoolClient,
  eventoId: string,
): Promise<MissaoInsight[]> {
  const { rows } = await cliente.query<{
    challenge_id: string;
    title_key: string | null;
    custom_title: string | null;
    emoji: string | null;
    fotos: string;
  }>(
    `SELECT c.id AS challenge_id, c.title_key, c.custom_title, c.emoji,
            COUNT(u.id)::text AS fotos
     FROM challenges c
     JOIN uploads u ON u.challenge_id = c.id AND u.state = 'published'
     WHERE c.event_id = $1
     GROUP BY c.id, c.title_key, c.custom_title, c.emoji
     ORDER BY fotos DESC`,
    [eventoId],
  );

  return rows.map((r) => ({
    challengeId: r.challenge_id,
    titleKey: r.title_key,
    customTitle: r.custom_title,
    emoji: r.emoji,
    fotos: Number(r.fotos),
  }));
}

/**
 * Contagem de fotos por hora UTC (0–23) para o evento.
 * Permite ao casal ver a "hora de ouro" da festa.
 */
export async function fotosPorHora(
  cliente: PoolClient,
  eventoId: string,
  fuso: string,
): Promise<HoraInsight[]> {
  const { rows } = await cliente.query<{ hora: string; fotos: string }>(
    `SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE $2)::int::text AS hora,
            COUNT(*)::text AS fotos
     FROM uploads
     WHERE event_id = $1 AND state = 'published'
     GROUP BY hora
     ORDER BY hora`,
    [eventoId, fuso],
  );

  return rows.map((r) => ({
    hora: Number(r.hora),
    fotos: Number(r.fotos),
  }));
}
