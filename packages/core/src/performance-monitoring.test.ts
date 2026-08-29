import { describe, expect, it } from "vitest";
import { aggregateApiMetrics, extractRoute, isSlowRequest, type ApiMetric } from "./performance-monitoring";

describe("aggregateApiMetrics", () => {
  it("agrega por rota e método", () => {
    const metrics: ApiMetric[] = [
      { route: "/api/uploads/confirm", method: "POST", statusCode: 200, durationMs: 100, timestamp: 1 },
      { route: "/api/uploads/confirm", method: "POST", statusCode: 200, durationMs: 150, timestamp: 2 },
      { route: "/api/uploads/confirm", method: "POST", statusCode: 500, durationMs: 200, timestamp: 3 },
    ];
    const stats = aggregateApiMetrics(metrics).get("POST:/api/uploads/confirm");
    expect(stats?.totalRequests).toBe(3);
    expect(stats?.errorRate).toBeCloseTo(0.333, 2);
    expect(stats?.latency.p50).toBe(150);
    expect(stats?.statusCodes[200]).toBe(2);
  });

  it("retorna vazio para lista vazia", () => {
    expect(aggregateApiMetrics([]).size).toBe(0);
  });
});

describe("isSlowRequest", () => {
  it("usa limiar da rota crítica de upload", () => {
    expect(isSlowRequest(600, "/api/uploads/presign")).toBe(true);
    expect(isSlowRequest(400, "/api/uploads/presign")).toBe(false);
  });

  it("usa limiar padrão fora do caminho crítico", () => {
    expect(isSlowRequest(2500, "/api/unknown")).toBe(true);
    expect(isSlowRequest(1500, "/api/unknown")).toBe(false);
  });
});

describe("extractRoute", () => {
  it("substitui UUID por :id", () => {
    expect(extractRoute("/api/events/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/feed")).toBe(
      "/api/events/:id/feed",
    );
  });
});
