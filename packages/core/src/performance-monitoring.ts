export type ApiMetric = {
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  timestamp: number;
  eventId?: string;
  sessionId?: string;
};

export type ApiPerformanceStats = {
  route: string;
  method: string;
  totalRequests: number;
  errorRate: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    max: number;
  };
  statusCodes: Record<number, number>;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

export function aggregateApiMetrics(metrics: ApiMetric[]): Map<string, ApiPerformanceStats> {
  const grouped = new Map<string, ApiMetric[]>();

  for (const metric of metrics) {
    const key = `${metric.method}:${metric.route}`;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(metric);
    else grouped.set(key, [metric]);
  }

  const stats = new Map<string, ApiPerformanceStats>();

  for (const [key, routeMetrics] of grouped) {
    const [method, route] = key.split(":");
    const durations = routeMetrics.map((m) => m.durationMs).sort((a, b) => a - b);
    const errors = routeMetrics.filter((m) => m.statusCode >= 400).length;
    const statusCodes: Record<number, number> = {};
    for (const metric of routeMetrics) {
      statusCodes[metric.statusCode] = (statusCodes[metric.statusCode] ?? 0) + 1;
    }

    stats.set(key, {
      route: route ?? "",
      method: method ?? "",
      totalRequests: routeMetrics.length,
      errorRate: routeMetrics.length > 0 ? errors / routeMetrics.length : 0,
      latency: {
        p50: percentile(durations, 50),
        p95: percentile(durations, 95),
        p99: percentile(durations, 99),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
        max: Math.max(...durations, 0),
      },
      statusCodes,
    });
  }

  return stats;
}

export function extractRoute(url: string): string {
  try {
    const path = new URL(url, "http://localhost").pathname;
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
      .replace(/\/[a-z0-9-]{20,}/gi, "/:id")
      .replace(/\/\d+/g, "/:id");
  } catch {
    return url;
  }
}

const SLOW_THRESHOLDS: Record<string, number> = {
  "/api/uploads/presign": 500,
  "/api/uploads/confirm": 1000,
  "/api/wall": 300,
};

export function isSlowRequest(durationMs: number, route: string): boolean {
  return durationMs > (SLOW_THRESHOLDS[route] ?? 2000);
}
