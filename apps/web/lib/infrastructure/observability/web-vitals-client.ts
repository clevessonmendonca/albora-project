"use client";

import { useEffect } from "react";
import {
  getWebVitalRating,
  shouldSample,
  type WebVitalMetric,
  type WebVitalName,
} from "@albora/core";

type WebVitalsConfig = {
  samplingRate?: number;
  eventId?: string;
  sessionId?: string;
};

function navigationType(): WebVitalMetric["navigationType"] {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const type = nav?.type;
  if (type === "reload" || type === "back_forward") return type === "back_forward" ? "back-forward" : "reload";
  return "navigate";
}

function metricId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toMetric(name: WebVitalName, value: number): WebVitalMetric {
  return {
    name,
    value,
    rating: getWebVitalRating(name, value),
    delta: value,
    id: metricId(),
    navigationType: navigationType(),
  };
}

export function sendWebVital(
  metric: WebVitalMetric,
  opts?: { eventId?: string; sessionId?: string },
): void {
  try {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      eventId: opts?.eventId,
      sessionId: opts?.sessionId,
      timestamp: Date.now(),
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/web-vitals", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/analytics/web-vitals", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    });
  } catch {
    /* analytics degrada */
  }
}

function observe(type: string, buffered: boolean, onEntry: (entry: PerformanceEntry) => void): void {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) onEntry(entry);
    });
    observer.observe({ type, buffered });
  } catch {
    /* API indisponível no browser */
  }
}

export function initWebVitals(
  handler: (metric: WebVitalMetric) => void,
  config: WebVitalsConfig = {},
): void {
  if (typeof PerformanceObserver === "undefined") return;
  if (!shouldSample(config.samplingRate ?? 0.1)) return;

  observe("largest-contentful-paint", true, (entry) => {
    handler(toMetric("LCP", entry.startTime));
  });
  observe("paint", true, (entry) => {
    if (entry.name === "first-contentful-paint") handler(toMetric("FCP", entry.startTime));
  });

  let cls = 0;
  observe("layout-shift", true, (entry) => {
    const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
    if (shift.hadRecentInput) return;
    cls += shift.value ?? 0;
    handler(toMetric("CLS", cls));
  });

  observe("event", true, (entry) => {
    const duration = (entry as PerformanceEntry & { duration?: number }).duration ?? 0;
    if (duration > 0) handler(toMetric("INP", duration));
  });

  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav) handler(toMetric("TTFB", nav.responseStart));
}

export function WebVitalsCollector({
  eventId,
  sessionId,
}: {
  eventId?: string;
  sessionId?: string;
}) {
  useEffect(() => {
    initWebVitals((metric) => sendWebVital(metric, { eventId, sessionId }), {
      eventId,
      sessionId,
    });
  }, [eventId, sessionId]);

  return null;
}
