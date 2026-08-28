import type { CodigoDaTese, DegrauDoFunil } from "@albora/core";
import { decidirTese } from "@albora/core";
import type { Pool } from "pg";
import { comEvento } from "./event";
import { lerMetricasAoVivo } from "./event-metrics";
import { HORAS_APOS_EVENTO } from "./events";
import { lerFunilAgregado, type EntradasPorVia } from "./funnel-aggregate";

export const PRODUCT_EVENT_NAMES = [
  "landing_view",
  "landing_scroll_50",
  "landing_demo",
  "landing_cta",
  "account_created",
  "event_created",
  "qr_downloaded",
  "checkout_started",
  "checkout_paid",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

/** Agregados de um evento — sem nomes, thumbs ou PII. */
export type EventLiveMetrics = {
  expectedGuests: number;
  totalSessoes: number;
  sessoesComUpload: number;
  totalFotos: number;
  participacao: number;
  veredito: CodigoDaTese;
  degraus: DegrauDoFunil[];
  uploadsAntesDoFeed: number;
  uploadsDepoisDoFeed: number;
  entradasPorVia: EntradasPorVia;
};

export function isProductEventName(v: unknown): v is ProductEventName {
  return typeof v === "string" && (PRODUCT_EVENT_NAMES as readonly string[]).includes(v);
}

/** Analytics de landing — engole falha (nunca atrasa upload). */
export async function recordProductEvent(
  pool: Pool,
  name: ProductEventName,
  opts?: { anonId?: string | null; packHint?: string | null },
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO product_events (name, anon_id, pack_hint) VALUES ($1, $2, $3)`,
      [name, opts?.anonId ?? null, opts?.packHint ?? null],
    );
  } catch (e) {
    console.warn("product_event.falhou", { name, err: String(e) });
  }
}

export async function upsertAnalyticsSnapshot(
  pool: Pool,
  entrada: {
    scope: "event" | "vendor" | "platform";
    scopeId: string;
    period: "live" | "day" | "week" | "all";
    metrics: Record<string, unknown>;
  },
): Promise<void> {
  await pool.query(
    `INSERT INTO analytics_snapshots (scope, scope_id, period, metrics, computed_at)
     VALUES ($1, $2, $3, $4::jsonb, now())
     ON CONFLICT (scope, scope_id, period)
     DO UPDATE SET metrics = EXCLUDED.metrics, computed_at = now()`,
    [entrada.scope, entrada.scopeId, entrada.period, JSON.stringify(entrada.metrics)],
  );
}

export async function readAnalyticsSnapshot(
  pool: Pool,
  scope: "event" | "vendor" | "platform",
  scopeId: string,
  period: "live" | "day" | "week" | "all",
): Promise<{ metrics: Record<string, unknown>; computedAt: Date } | null> {
  const { rows } = await pool.query<{ metrics: Record<string, unknown>; computed_at: Date }>(
    `SELECT metrics, computed_at FROM analytics_snapshots
      WHERE scope = $1 AND scope_id = $2 AND period = $3`,
    [scope, scopeId, period],
  );
  const r = rows[0];
  if (!r) return null;
  return { metrics: r.metrics, computedAt: r.computed_at };
}

/** KPIs agregados — sem PII. Só dentro de comEvento. */
export async function collectEventLiveMetrics(
  pool: Pool,
  eventId: string,
): Promise<EventLiveMetrics> {
  return comEvento(pool, eventId, async (c) => {
    const [{ rows }, metricas, funil] = await Promise.all([
      c.query<{ expected_guests: number }>(
        `SELECT expected_guests FROM events WHERE id = $1`,
        [eventId],
      ),
      lerMetricasAoVivo(c, eventId),
      lerFunilAgregado(c, eventId),
    ]);

    const expectedGuests = rows[0]?.expected_guests;
    if (!expectedGuests || expectedGuests <= 0) {
      throw new Error("expected_guests inválido no snapshot");
    }

    const veredito = decidirTese({
      expectedGuests,
      sessoesComUpload: metricas.sessoesComUpload,
    });

    return {
      expectedGuests,
      totalSessoes: funil.totalSessoes,
      sessoesComUpload: metricas.sessoesComUpload,
      totalFotos: metricas.totalFotos,
      participacao: veredito.taxa,
      veredito: veredito.codigo,
      degraus: funil.degraus,
      uploadsAntesDoFeed: funil.uploadsAntesDoFeed,
      uploadsDepoisDoFeed: funil.uploadsDepoisDoFeed,
      entradasPorVia: funil.entradasPorVia,
    };
  });
}

/** Materializa analytics_snapshots scope=event; metrics sem PII. */
export async function materializeEventSnapshot(pool: Pool, eventId: string): Promise<EventLiveMetrics> {
  const metrics = await collectEventLiveMetrics(pool, eventId);
  await upsertAnalyticsSnapshot(pool, {
    scope: "event",
    scopeId: eventId,
    period: "live",
    metrics: metrics as unknown as Record<string, unknown>,
  });
  return metrics;
}

/** Lista cross-event: pool do job precisa BYPASSRLS/owner. */
export async function listOpenEventIdsForSnapshots(
  pool: Pool,
  agora: Date = new Date(),
): Promise<string[]> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM events
      WHERE starts_at <= $1
        AND ends_at + make_interval(hours => $2) > $1
      ORDER BY starts_at ASC`,
    [agora, HORAS_APOS_EVENTO],
  );
  return rows.map((r) => r.id);
}

/** scope_id canônico do snapshot da plataforma (uma linha só). */
export const PLATFORM_SNAPSHOT_SCOPE_ID = "albora";

/** Agregados cross-event — sem nomes, thumbs, e-mails ou PII. */
export type PlatformLiveMetrics = {
  windowDays: number;
  eventsWithActivity: number;
  totalUploads: number;
  totalProductEvents: number;
  openTickets: number;
  productEventsByName: Record<string, number>;
};

/** Pool deve ter BYPASSRLS/owner — cruza eventos sem RLS. */
export async function collectPlatformLiveMetrics(
  pool: Pool,
  windowDays = 7,
): Promise<PlatformLiveMetrics> {
  const dias = Math.max(1, Math.floor(windowDays));
  const [{ rows: kpis }, { rows: byName }] = await Promise.all([
    pool.query<{
      events_with_activity: number;
      total_uploads: number;
      total_product_events: number;
      open_tickets: number;
    }>(
      `SELECT
        (SELECT count(DISTINCT event_id)::int FROM uploads
          WHERE created_at > now() - make_interval(days => $1)) AS events_with_activity,
        (SELECT count(*)::int FROM uploads
          WHERE created_at > now() - make_interval(days => $1)) AS total_uploads,
        (SELECT count(*)::int FROM product_events
          WHERE created_at > now() - make_interval(days => $1)) AS total_product_events,
        (SELECT count(*)::int FROM support_tickets
          WHERE status IN ('open', 'pending')) AS open_tickets`,
      [dias],
    ),
    pool.query<{ name: string; n: number }>(
      `SELECT name, count(*)::int AS n FROM product_events
        WHERE created_at > now() - make_interval(days => $1)
        GROUP BY name ORDER BY n DESC`,
      [dias],
    ),
  ]);

  const k = kpis[0];
  const productEventsByName: Record<string, number> = {};
  for (const row of byName) {
    productEventsByName[row.name] = row.n;
  }

  return {
    windowDays: dias,
    eventsWithActivity: k?.events_with_activity ?? 0,
    totalUploads: k?.total_uploads ?? 0,
    totalProductEvents: k?.total_product_events ?? 0,
    openTickets: k?.open_tickets ?? 0,
    productEventsByName,
  };
}

/** Materializa analytics_snapshots scope=platform; metrics sem PII. */
export async function materializePlatformSnapshot(
  pool: Pool,
  windowDays = 7,
): Promise<PlatformLiveMetrics> {
  const metrics = await collectPlatformLiveMetrics(pool, windowDays);
  await upsertAnalyticsSnapshot(pool, {
    scope: "platform",
    scopeId: PLATFORM_SNAPSHOT_SCOPE_ID,
    period: "live",
    metrics: metrics as unknown as Record<string, unknown>,
  });
  return metrics;
}
