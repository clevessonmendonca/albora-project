"use client";

/**
 * Web Vitals tracking no cliente
 * 
 * Coleta Core Web Vitals (LCP, INP, CLS) e envia para analytics.
 * Executa apenas no browser, com sampling para reduzir overhead.
 */

import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";
import { getWebVitalRating, shouldSample, type WebVitalMetric } from "@albora/core";

type VitalsHandler = (metric: WebVitalMetric) => void;

/**
 * Configuração de Web Vitals tracking
 */
export type WebVitalsConfig = {
  samplingRate?: number;
  debug?: boolean;
  eventId?: string;
  sessionId?: string;
};

/**
 * Inicia tracking de Core Web Vitals
 * 
 * @param handler - Callback para processar métricas coletadas
 * @param config - Configuração (sampling, debug, etc)
 */
export function initWebVitals(handler: VitalsHandler, config: WebVitalsConfig = {}) {
  const { samplingRate = 0.1, debug = false, eventId, sessionId } = config;

  if (!shouldSample(samplingRate)) {
    if (debug) console.log("web_vitals.skipped_sampling");
    return;
  }

  const sendMetric = (metric: unknown) => {
    try {
      const m = metric as {
        name: WebVitalMetric["name"];
        value: number;
        delta: number;
        id: string;
        navigationType?: WebVitalMetric["navigationType"];
      };
      const vitalsMetric: WebVitalMetric = {
        name: m.name,
        value: m.value,
        rating: getWebVitalRating(m.name, m.value),
        delta: m.delta,
        id: m.id,
        navigationType: m.navigationType || "navigate",
      };

      if (debug) {
        console.log("web_vitals.collected", {
          name: vitalsMetric.name,
          value: vitalsMetric.value,
          rating: vitalsMetric.rating,
          eventId,
          sessionId,
        });
      }

      handler(vitalsMetric);
    } catch (e) {
      if (debug) console.warn("web_vitals.handler_failed", String(e));
    }
  };

  onLCP(sendMetric);
  onINP(sendMetric);
  onCLS(sendMetric);
  onFCP(sendMetric);
  onTTFB(sendMetric);
}

/**
 * Envia métrica para endpoint de analytics
 */
export async function sendWebVital(
  metric: WebVitalMetric,
  opts?: { eventId?: string; sessionId?: string },
): Promise<void> {
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
      navigator.sendBeacon("/api/analytics/web-vitals", body);
    } else {
      fetch("/api/analytics/web-vitals", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // best-effort: envio de analytics nunca deve quebrar o fluxo do cliente
  }
}
