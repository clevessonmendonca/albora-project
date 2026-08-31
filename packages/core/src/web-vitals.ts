/**
 * Core Web Vitals tracking
 * 
 * Coleta métricas de performance (LCP, INP, CLS) sem adicionar
 * overhead significativo. Todos os tracking são async e não bloqueiam.
 * 
 * Baseado na biblioteca web-vitals oficial do Google.
 */

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

export type WebVitalHandler = (metric: WebVitalMetric) => void;

/**
 * Thresholds oficiais do Web Vitals (75th percentile)
 * https://web.dev/articles/defining-core-web-vitals-thresholds
 */
export const WEB_VITAL_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
} as const;

/**
 * Calcula o rating de uma métrica baseado nos thresholds oficiais
 */
export function getWebVitalRating(name: WebVitalName, value: number): WebVitalRating {
  const threshold = WEB_VITAL_THRESHOLDS[name];
  if (!threshold) return "good";

  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

/**
 * Agrupa métricas por sessão
 */
export type WebVitalsSession = {
  sessionId: string;
  eventId?: string;
  metrics: WebVitalMetric[];
  timestamp: number;
};

/**
 * Estatísticas agregadas de web vitals
 */
export type WebVitalsStats = {
  lcp: { p50: number; p75: number; p95: number; samples: number };
  inp: { p50: number; p75: number; p95: number; samples: number };
  cls: { p50: number; p75: number; p95: number; samples: number };
};

/**
 * Calcula percentis de um array de valores
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

/**
 * Agrega métricas em estatísticas
 */
export function aggregateWebVitals(sessions: WebVitalsSession[]): WebVitalsStats {
  const lcpValues: number[] = [];
  const inpValues: number[] = [];
  const clsValues: number[] = [];

  for (const session of sessions) {
    for (const metric of session.metrics) {
      if (metric.name === "LCP") lcpValues.push(metric.value);
      if (metric.name === "INP") inpValues.push(metric.value);
      if (metric.name === "CLS") clsValues.push(metric.value);
    }
  }

  return {
    lcp: {
      p50: percentile(lcpValues, 50),
      p75: percentile(lcpValues, 75),
      p95: percentile(lcpValues, 95),
      samples: lcpValues.length,
    },
    inp: {
      p50: percentile(inpValues, 50),
      p75: percentile(inpValues, 75),
      p95: percentile(inpValues, 95),
      samples: inpValues.length,
    },
    cls: {
      p50: percentile(clsValues, 50),
      p75: percentile(clsValues, 75),
      p95: percentile(clsValues, 95),
      samples: clsValues.length,
    },
  };
}

/**
 * Sampling rate: não enviar 100% das métricas em produção
 * para reduzir overhead de armazenamento e processamento.
 * 
 * @param rate - Taxa de sampling (0-1). Default: 0.1 (10%)
 */
export function shouldSample(rate: number = 0.1): boolean {
  return Math.random() < rate;
}
