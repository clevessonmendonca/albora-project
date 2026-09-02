import { describe, it, expect } from "vitest";
import {
  getWebVitalRating,
  aggregateWebVitals,
  shouldSample,
  type WebVitalsSession,
} from "./web-vitals";

describe("getWebVitalRating", () => {
  it("classifica LCP como good quando <= 2500ms", () => {
    expect(getWebVitalRating("LCP", 2000)).toBe("good");
    expect(getWebVitalRating("LCP", 2500)).toBe("good");
  });

  it("classifica LCP como needs-improvement quando entre 2500-4000ms", () => {
    expect(getWebVitalRating("LCP", 3000)).toBe("needs-improvement");
    expect(getWebVitalRating("LCP", 4000)).toBe("needs-improvement");
  });

  it("classifica LCP como poor quando > 4000ms", () => {
    expect(getWebVitalRating("LCP", 4001)).toBe("poor");
    expect(getWebVitalRating("LCP", 5000)).toBe("poor");
  });

  it("classifica INP como good quando <= 200ms", () => {
    expect(getWebVitalRating("INP", 100)).toBe("good");
    expect(getWebVitalRating("INP", 200)).toBe("good");
  });

  it("classifica CLS como good quando <= 0.1", () => {
    expect(getWebVitalRating("CLS", 0.05)).toBe("good");
    expect(getWebVitalRating("CLS", 0.1)).toBe("good");
  });
});

describe("aggregateWebVitals", () => {
  it("calcula percentis corretamente", () => {
    const sessions: WebVitalsSession[] = [
      {
        sessionId: "1",
        timestamp: Date.now(),
        metrics: [
          {
            name: "LCP",
            value: 1000,
            rating: "good",
            delta: 0,
            id: "1",
            navigationType: "navigate",
          },
          {
            name: "INP",
            value: 100,
            rating: "good",
            delta: 0,
            id: "2",
            navigationType: "navigate",
          },
        ],
      },
      {
        sessionId: "2",
        timestamp: Date.now(),
        metrics: [
          {
            name: "LCP",
            value: 3000,
            rating: "needs-improvement",
            delta: 0,
            id: "3",
            navigationType: "navigate",
          },
        ],
      },
    ];

    const stats = aggregateWebVitals(sessions);

    expect(stats.lcp.samples).toBe(2);
    expect(stats.lcp.p50).toBeGreaterThan(0);
    expect(stats.inp.samples).toBe(1);
  });

  it("retorna zeros quando não há métricas", () => {
    const stats = aggregateWebVitals([]);

    expect(stats.lcp.samples).toBe(0);
    expect(stats.lcp.p50).toBe(0);
  });
});

describe("shouldSample", () => {
  it("retorna true ou false baseado na taxa", () => {
    const results = Array.from({ length: 100 }, () => shouldSample(0.5));
    const trueCount = results.filter((r) => r).length;

    expect(trueCount).toBeGreaterThan(30);
    expect(trueCount).toBeLessThan(70);
  });

  it("sempre retorna false quando taxa é 0", () => {
    const results = Array.from({ length: 100 }, () => shouldSample(0));
    expect(results.every((r) => !r)).toBe(true);
  });

  it("sempre retorna true quando taxa é 1", () => {
    const results = Array.from({ length: 100 }, () => shouldSample(1));
    expect(results.every((r) => r)).toBe(true);
  });
});
