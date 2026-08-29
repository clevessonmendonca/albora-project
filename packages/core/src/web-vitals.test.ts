import { describe, expect, it } from "vitest";
import { aggregateWebVitals, getWebVitalRating, shouldSample, type WebVitalsSession } from "./web-vitals";

describe("getWebVitalRating", () => {
  it("classifica LCP pelos limiares oficiais", () => {
    expect(getWebVitalRating("LCP", 2500)).toBe("good");
    expect(getWebVitalRating("LCP", 3000)).toBe("needs-improvement");
    expect(getWebVitalRating("LCP", 4001)).toBe("poor");
  });

  it("classifica INP e CLS", () => {
    expect(getWebVitalRating("INP", 200)).toBe("good");
    expect(getWebVitalRating("CLS", 0.1)).toBe("good");
    expect(getWebVitalRating("CLS", 0.2)).toBe("needs-improvement");
  });
});

describe("aggregateWebVitals", () => {
  it("calcula percentis e amostras", () => {
    const sessions: WebVitalsSession[] = [
      {
        sessionId: "1",
        timestamp: 1,
        metrics: [
          { name: "LCP", value: 1000, rating: "good", delta: 0, id: "1", navigationType: "navigate" },
          { name: "INP", value: 100, rating: "good", delta: 0, id: "2", navigationType: "navigate" },
        ],
      },
      {
        sessionId: "2",
        timestamp: 2,
        metrics: [
          { name: "LCP", value: 3000, rating: "needs-improvement", delta: 0, id: "3", navigationType: "navigate" },
        ],
      },
    ];
    const stats = aggregateWebVitals(sessions);
    expect(stats.lcp.samples).toBe(2);
    expect(stats.lcp.p50).toBeGreaterThan(0);
    expect(stats.inp.samples).toBe(1);
  });

  it("retorna zeros sem métricas", () => {
    const stats = aggregateWebVitals([]);
    expect(stats.lcp.samples).toBe(0);
    expect(stats.lcp.p50).toBe(0);
  });
});

describe("shouldSample", () => {
  it("nunca amostra com taxa 0 e sempre com taxa 1", () => {
    expect(Array.from({ length: 40 }, () => shouldSample(0)).every((v) => !v)).toBe(true);
    expect(Array.from({ length: 40 }, () => shouldSample(1)).every((v) => v)).toBe(true);
  });
});
