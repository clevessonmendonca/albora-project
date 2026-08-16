import type { Pool } from "pg";

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
