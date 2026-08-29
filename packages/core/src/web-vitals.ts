export type WebVitalName = "LCP" | "INP" | "CLS" | "FCP" | "TTFB";
export type WebVitalRating = "good" | "needs-improvement" | "poor";

export type WebVitalMetric = {
  name: WebVitalName;
  value: number;
  rating: WebVitalRating;
  delta: number;
  id: string;
  navigationType: "navigate" | "reload" | "back-forward" | "prerender";
};

export const WEB_VITAL_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
} as const;

export function getWebVitalRating(name: WebVitalName, value: number): WebVitalRating {
  const threshold = WEB_VITAL_THRESHOLDS[name];
  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

export type WebVitalsSession = {
  sessionId: string;
  eventId?: string;
  metrics: WebVitalMetric[];
  timestamp: number;
};

export type WebVitalsStats = {
  lcp: { p50: number; p75: number; p95: number; samples: number };
  inp: { p50: number; p75: number; p95: number; samples: number };
  cls: { p50: number; p75: number; p95: number; samples: number };
};

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

function bucket(values: number[]) {
  return {
    p50: percentile(values, 50),
    p75: percentile(values, 75),
    p95: percentile(values, 95),
    samples: values.length,
  };
}

export function aggregateWebVitals(sessions: WebVitalsSession[]): WebVitalsStats {
  const lcp: number[] = [];
  const inp: number[] = [];
  const cls: number[] = [];

  for (const session of sessions) {
    for (const metric of session.metrics) {
      if (metric.name === "LCP") lcp.push(metric.value);
      if (metric.name === "INP") inp.push(metric.value);
      if (metric.name === "CLS") cls.push(metric.value);
    }
  }

  return { lcp: bucket(lcp), inp: bucket(inp), cls: bucket(cls) };
}

export function shouldSample(rate = 0.1): boolean {
  return Math.random() < rate;
}
