import type { PlatformLiveMetrics } from "@albora/db";

/** Aceita o JSON gravado em analytics_snapshots (scope=platform). */
export function parsePlatformLiveMetrics(raw: Record<string, unknown> | null | undefined): PlatformLiveMetrics | null {
  if (!raw || typeof raw !== "object") return null;
  if (
    typeof raw.windowDays !== "number" ||
    typeof raw.eventsWithActivity !== "number" ||
    typeof raw.totalUploads !== "number" ||
    typeof raw.totalProductEvents !== "number" ||
    typeof raw.openTickets !== "number" ||
    !raw.productEventsByName ||
    typeof raw.productEventsByName !== "object"
  ) {
    return null;
  }
  const productEventsByName: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw.productEventsByName as Record<string, unknown>)) {
    if (typeof v === "number") productEventsByName[k] = v;
  }
  return {
    windowDays: raw.windowDays,
    eventsWithActivity: raw.eventsWithActivity,
    totalUploads: raw.totalUploads,
    totalProductEvents: raw.totalProductEvents,
    openTickets: raw.openTickets,
    productEventsByName,
  };
}
