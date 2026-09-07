import { describe, expect, it } from "vitest";
import { parsePlatformLiveMetrics } from "./platform-metrics";

describe("parsePlatformLiveMetrics", () => {
  it("aceita snapshot válido", () => {
    expect(
      parsePlatformLiveMetrics({
        windowDays: 7,
        eventsWithActivity: 2,
        totalUploads: 40,
        totalProductEvents: 9,
        openTickets: 1,
        productEventsByName: { landing_view: 5, checkout_paid: 1 },
      }),
    ).toEqual({
      windowDays: 7,
      eventsWithActivity: 2,
      totalUploads: 40,
      totalProductEvents: 9,
      openTickets: 1,
      productEventsByName: { landing_view: 5, checkout_paid: 1 },
    });
  });

  it("rejeita payload incompleto", () => {
    expect(parsePlatformLiveMetrics({ windowDays: 7 })).toBeNull();
    expect(parsePlatformLiveMetrics(null)).toBeNull();
  });
});
