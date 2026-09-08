import type { DegrauDoFunil } from "@albora/core";
import type { Pool } from "pg";
import { maskEmail } from "./accounts-admin";
import { collectEventLiveMetrics } from "./analytics";
import { aceitesDeEntradaPorVersao, type AceiteDeConsentimento } from "./consent-db";
import { comEvento } from "./event";
import { HORAS_APOS_EVENTO } from "./events";
import { lerMetricasAoVivo } from "./event-metrics";
import { lerFunilAgregado } from "./funnel-aggregate";

export type EventAdminStatus = "draft" | "active" | "ended";

/** Agregados de um evento pro console — sem nome nem contato de convidado. */
export type EventAdminRow = {
  id: string;
  title: string | null;
  accountId: string;
  hostMaskedEmail: string;
  vendorId: string | null;
  vendorName: string | null;
  startsAt: Date;
  expectedGuests: number;
  totalFotos: number;
  /** `null` quando a base não é honesta (sem `expected_guests`) — nunca `0`, que diria "ninguém participou". */
  h1: number | null;
  status: EventAdminStatus;
};

/**
 * `expected_guests` é `NOT NULL DEFAULT 150 CHECK (> 0)` (migration 0020) — na
 * prática todo evento tem denominador. A guarda fica porque é ela que decide
 * se `collectEventLiveMetrics` (que lança `MetricaInvalida` sem denominador)
 * chega a ser chamada: H1 sem base honesta não vira número.
 */
export function isH1Calculavel(expectedGuests: number | null | undefined): expectedGuests is number {
  return typeof expectedGuests === "number" && Number.isFinite(expectedGuests) && expectedGuests > 0;
}

/** Reaproveita `collectEventLiveMetrics`/`decidirTese` (T2) quando há denominador; senão só o total de fotos, sem inventar H1. */
async function metricsForEvent(
  pool: Pool,
  eventId: string,
  expectedGuests: number | null,
): Promise<{ totalFotos: number; h1: number | null }> {
  if (!isH1Calculavel(expectedGuests)) {
    const metricas = await comEvento(pool, eventId, (c) => lerMetricasAoVivo(c, eventId));
    return { totalFotos: metricas.totalFotos, h1: null };
  }
  const metricas = await collectEventLiveMetrics(pool, eventId);
  return { totalFotos: metricas.totalFotos, h1: metricas.participacao };
}

type Cursor = { startsAt: string; id: string };
function encodeCursor(startsAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ startsAt: startsAt.toISOString(), id } satisfies Cursor)).toString(
    "base64url",
  );
}
function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Cursor;
}

export type ListEventsAdminFilter = {
  /**
   * Janela real de festa, não ciclo de vida: `status = 'active'` é setado no
   * publicar e fica ligado dias antes de alguém chegar. "Ao vivo" é
   * `starts_at` já passado e `ends_at` ainda dentro da carência de
   * `HORAS_APOS_EVENTO` — a mesma que o cron de snapshot usa.
   */
  aoVivoEm?: Date;
  status?: EventAdminStatus;
  vendorId?: string;
  search?: string;
  limit: number;
  cursor?: string;
};

type EventoBaseRow = {
  id: string;
  title: string | null;
  account_id: string;
  host_email: string;
  vendor_id: string | null;
  vendor_name: string | null;
  starts_at: Date;
  expected_guests: number | null;
  status: EventAdminStatus;
};

/**
 * Cross-evento por desenho — chamado sob `withPlatformAggregation`.
 *
 * Título/status/vendor entram no `WHERE` da mesma query que pagina, nunca
 * como `.filter()` em JS depois do `LIMIT` — mesma ressalva de
 * `listAccountsAdmin`: filtrar depois do banco quebraria a contagem da
 * barra de ferramentas e o cursor da próxima página.
 *
 * Zero PII de convidado por construção: `events` + `accounts.email`
 * (mascarado, titular de conta) + `vendors.name` (identidade de negócio,
 * não convidado) + agregados de `collectEventLiveMetrics`. Nenhuma leitura
 * toca `guest_sessions.display_name`.
 */
export async function listEventsAdmin(
  pool: Pool,
  filter: ListEventsAdminFilter,
): Promise<{ rows: EventAdminRow[]; nextCursor: string | null }> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.search) {
    params.push(`%${filter.search.toLowerCase()}%`);
    clauses.push(`lower(e.title) ILIKE $${params.length}`);
  }
  if (filter.status) {
    params.push(filter.status);
    clauses.push(`e.status = $${params.length}`);
  }
  if (filter.aoVivoEm) {
    params.push(filter.aoVivoEm, HORAS_APOS_EVENTO);
    clauses.push(
      `e.starts_at <= $${params.length - 1} AND e.ends_at + make_interval(hours => $${params.length}) > $${params.length - 1}`,
    );
  }
  if (filter.vendorId) {
    params.push(filter.vendorId);
    clauses.push(`e.vendor_id = $${params.length}`);
  }
  if (filter.cursor) {
    const c = decodeCursor(filter.cursor);
    params.push(c.startsAt, c.id);
    clauses.push(`(e.starts_at, e.id) < ($${params.length - 1}, $${params.length})`);
  }
  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query<EventoBaseRow>(
    `SELECT e.id, e.title, e.account_id, a.email AS host_email,
            e.vendor_id, v.name AS vendor_name,
            e.starts_at, e.expected_guests, e.status
       FROM events e
       JOIN accounts a ON a.id = e.account_id
       LEFT JOIN vendors v ON v.id = e.vendor_id
       ${where}
      ORDER BY e.starts_at DESC, e.id DESC
      LIMIT $${params.length}`,
    params,
  );

  const comMetricas: EventAdminRow[] = [];
  for (const evento of rows) {
    const { totalFotos, h1 } = await metricsForEvent(pool, evento.id, evento.expected_guests);
    comMetricas.push({
      id: evento.id,
      title: evento.title,
      accountId: evento.account_id,
      hostMaskedEmail: maskEmail(evento.host_email),
      vendorId: evento.vendor_id,
      vendorName: evento.vendor_name,
      startsAt: evento.starts_at,
      expectedGuests: evento.expected_guests ?? 0,
      totalFotos,
      h1,
      status: evento.status,
    });
  }

  const last = rows[rows.length - 1];
  const nextCursor = rows.length === filter.limit && last ? encodeCursor(last.starts_at, last.id) : null;
  return { rows: comMetricas, nextCursor };
}

export type EventDetailAdmin = EventAdminRow & {
  totalSessoes: number;
  degraus: DegrauDoFunil[];
  consentsByVersion: AceiteDeConsentimento[];
};

/**
 * Sob `withPlatformAggregation` — mesma leitura cross-tenant de
 * `listEventsAdmin`, agora para um evento só (detalhe, §8.1.4): funil e
 * consentimento por versão, ambos agregados, nunca por sessão nomeada.
 */
export async function getEventDetailAdmin(pool: Pool, eventId: string): Promise<EventDetailAdmin | null> {
  const { rows } = await pool.query<EventoBaseRow>(
    `SELECT e.id, e.title, e.account_id, a.email AS host_email,
            e.vendor_id, v.name AS vendor_name,
            e.starts_at, e.expected_guests, e.status
       FROM events e
       JOIN accounts a ON a.id = e.account_id
       LEFT JOIN vendors v ON v.id = e.vendor_id
      WHERE e.id = $1`,
    [eventId],
  );
  const evento = rows[0];
  if (!evento) return null;

  const [{ totalFotos, h1 }, funil, consentsByVersion] = await Promise.all([
    metricsForEvent(pool, eventId, evento.expected_guests),
    comEvento(pool, eventId, (c) => lerFunilAgregado(c, eventId)),
    comEvento(pool, eventId, (c) => aceitesDeEntradaPorVersao(c, eventId)),
  ]);

  return {
    id: evento.id,
    title: evento.title,
    accountId: evento.account_id,
    hostMaskedEmail: maskEmail(evento.host_email),
    vendorId: evento.vendor_id,
    vendorName: evento.vendor_name,
    startsAt: evento.starts_at,
    expectedGuests: evento.expected_guests ?? 0,
    totalFotos,
    h1,
    status: evento.status,
    totalSessoes: funil.totalSessoes,
    degraus: funil.degraus,
    consentsByVersion,
  };
}
