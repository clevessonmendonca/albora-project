import { logger } from "../logger/index.js";

export type MetricTags = Record<string, string>;

export interface MetricsProvider {
  increment(name: string, value: number, tags?: MetricTags): void;
  timing(name: string, ms: number, tags?: MetricTags): void;
  gauge(name: string, value: number, tags?: MetricTags): void;
}

class ConsoleMetricsProvider implements MetricsProvider {
  increment(name: string, value: number, tags?: MetricTags): void {
    logger.info({ metric: name, type: "counter", value, tags }, `metric.${name}`);
  }

  timing(name: string, ms: number, tags?: MetricTags): void {
    logger.info({ metric: name, type: "histogram", value: ms, unit: "ms", tags }, `metric.${name}`);
  }

  gauge(name: string, value: number, tags?: MetricTags): void {
    logger.info({ metric: name, type: "gauge", value, tags }, `metric.${name}`);
  }
}

let provider: MetricsProvider = new ConsoleMetricsProvider();

export function configureMetrics(p: MetricsProvider): void {
  provider = p;
}

export function resetMetrics(): void {
  provider = new ConsoleMetricsProvider();
}

export const metrics = {
  increment(name: string, value = 1, tags?: MetricTags): void {
    provider.increment(name, value, tags);
  },
  timing(name: string, ms: number, tags?: MetricTags): void {
    provider.timing(name, ms, tags);
  },
  gauge(name: string, value: number, tags?: MetricTags): void {
    provider.gauge(name, value, tags);
  },
};

export function withTiming<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: MetricTags,
): Promise<T> {
  const start = Date.now();
  return fn().then(
    (result) => {
      metrics.timing(name, Date.now() - start, tags);
      return result;
    },
    (error: unknown) => {
      metrics.timing(name, Date.now() - start, { ...tags, error: "true" });
      throw error;
    },
  );
}
