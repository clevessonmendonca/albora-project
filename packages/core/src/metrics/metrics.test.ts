import { afterEach, describe, expect, it } from "vitest";
import { configureMetrics, metrics, resetMetrics, withTiming } from "./index";
import type { MetricsProvider } from "./index";

afterEach(() => {
  resetMetrics();
});

describe("metrics", () => {
  it("delega increment, timing e gauge ao provider", () => {
    const calls: string[] = [];
    const provider: MetricsProvider = {
      increment(name, value, tags) {
        calls.push(`inc:${name}:${value}:${tags?.route ?? ""}`);
      },
      timing(name, ms, tags) {
        calls.push(`time:${name}:${ms}:${tags?.error ?? ""}`);
      },
      gauge(name, value) {
        calls.push(`gauge:${name}:${value}`);
      },
    };

    configureMetrics(provider);
    metrics.increment("upload.confirmed", 1, { route: "confirm" });
    metrics.timing("upload.duration", 42);
    metrics.gauge("events.active", 3);

    expect(calls).toEqual([
      "inc:upload.confirmed:1:confirm",
      "time:upload.duration:42:",
      "gauge:events.active:3",
    ]);
  });

  it("withTiming registra duração em sucesso e erro", async () => {
    const timings: { name: string; error?: string }[] = [];
    configureMetrics({
      increment() {},
      timing(name, _ms, tags) {
        if (tags?.error !== undefined) {
          timings.push({ name, error: tags.error });
        } else {
          timings.push({ name });
        }
      },
      gauge() {},
    });

    await expect(withTiming("job.ok", async () => 1)).resolves.toBe(1);
    await expect(
      withTiming("job.fail", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(timings[0]?.name).toBe("job.ok");
    expect(timings[0]?.error).toBeUndefined();
    expect(timings[1]?.name).toBe("job.fail");
    expect(timings[1]?.error).toBe("true");
  });
});
