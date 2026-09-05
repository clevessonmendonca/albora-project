import type { Pool } from "pg";
import { degraus, ehEventoDoFunil, type DegrauDoFunil, type EventoDoFunil } from "@albora/core";

export type PlatformParticipationWindow = { expectedGuests: number; sessoesComUpload: number };

/** Janela sobre `events.starts_at`/`uploads.created_at` — sem PII, cross-evento (pool BYPASSRLS). */
export async function platformParticipationInWindow(
  pool: Pool,
  janela: { from: Date; to: Date },
): Promise<PlatformParticipationWindow> {
  const [{ rows: esperados }, { rows: uploads }] = await Promise.all([
    pool.query<{ total: number }>(
      `SELECT coalesce(sum(expected_guests), 0)::int AS total
         FROM events WHERE starts_at >= $1 AND starts_at < $2`,
      [janela.from, janela.to],
    ),
    pool.query<{ total: number }>(
      `SELECT count(DISTINCT u.session_id)::int AS total
         FROM uploads u JOIN events ev ON ev.id = u.event_id
        WHERE ev.starts_at >= $1 AND ev.starts_at < $2`,
      [janela.from, janela.to],
    ),
  ]);
  return { expectedGuests: esperados[0]?.total ?? 0, sessoesComUpload: uploads[0]?.total ?? 0 };
}

export type PlatformParticipationDay = { date: string; rate: number | null };

/** Um ponto por dia dos últimos `dias` — `rate` null quando nenhum evento começou naquele dia (sem denominador honesto). */
export async function platformParticipationDailySeries(pool: Pool, dias: number): Promise<PlatformParticipationDay[]> {
  const [{ rows: porDiaEsperados }, { rows: porDiaUploads }] = await Promise.all([
    pool.query<{ dia: string; total: number }>(
      `SELECT to_char(date_trunc('day', starts_at), 'YYYY-MM-DD') AS dia, sum(expected_guests)::int AS total
         FROM events
        WHERE starts_at >= current_date - ($1::int - 1) AND starts_at < current_date + interval '1 day'
        GROUP BY 1`,
      [dias],
    ),
    pool.query<{ dia: string; total: number }>(
      `SELECT to_char(date_trunc('day', ev.starts_at), 'YYYY-MM-DD') AS dia, count(DISTINCT u.session_id)::int AS total
         FROM uploads u JOIN events ev ON ev.id = u.event_id
        WHERE ev.starts_at >= current_date - ($1::int - 1) AND ev.starts_at < current_date + interval '1 day'
        GROUP BY 1`,
      [dias],
    ),
  ]);

  const esperadosPorDia = new Map(porDiaEsperados.map((r) => [r.dia, r.total]));
  const uploadsPorDia = new Map(porDiaUploads.map((r) => [r.dia, r.total]));

  const pontos: PlatformParticipationDay[] = [];
  for (let i = dias - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const chave = d.toISOString().slice(0, 10);
    const esperados = esperadosPorDia.get(chave) ?? 0;
    const uploads = uploadsPorDia.get(chave) ?? 0;
    pontos.push({ date: chave, rate: esperados > 0 ? uploads / esperados : null });
  }
  return pontos;
}

/** Mesma `degraus()` do funil por evento (`@albora/core`), só que a sessão vem de qualquer evento na janela — cross-tenant por desenho. */
export async function platformFunnelInWindow(pool: Pool, janela: { from: Date; to: Date }): Promise<DegrauDoFunil[]> {
  const { rows } = await pool.query<{ session_id: string; name: string }>(
    `SELECT fe.session_id, fe.name
       FROM funnel_events fe JOIN events ev ON ev.id = fe.event_id
      WHERE fe.session_id IS NOT NULL AND ev.starts_at >= $1 AND ev.starts_at < $2
      ORDER BY fe.session_id, fe.created_at ASC, fe.id ASC`,
    [janela.from, janela.to],
  );

  const porSessao = new Map<string, EventoDoFunil[]>();
  for (const linha of rows) {
    if (!ehEventoDoFunil(linha.name)) continue;
    const lista = porSessao.get(linha.session_id) ?? [];
    lista.push(linha.name);
    porSessao.set(linha.session_id, lista);
  }
  return degraus([...porSessao.values()]);
}

export type PlatformVolumeWindow = { eventsCreated: number; guestsReached: number; photos: number };

export async function platformVolumeInWindow(pool: Pool, janela: { from: Date; to: Date }): Promise<PlatformVolumeWindow> {
  const { rows } = await pool.query<{ events_created: number; guests_reached: number; photos: number }>(
    `SELECT
        (SELECT count(*)::int FROM events WHERE starts_at >= $1 AND starts_at < $2) AS events_created,
        (SELECT coalesce(sum(expected_guests), 0)::int FROM events WHERE starts_at >= $1 AND starts_at < $2) AS guests_reached,
        (SELECT count(*)::int FROM uploads u JOIN events ev ON ev.id = u.event_id
          WHERE ev.starts_at >= $1 AND ev.starts_at < $2) AS photos`,
    [janela.from, janela.to],
  );
  const r = rows[0];
  return { eventsCreated: r?.events_created ?? 0, guestsReached: r?.guests_reached ?? 0, photos: r?.photos ?? 0 };
}
