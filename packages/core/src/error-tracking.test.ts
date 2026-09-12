import { describe, it, expect } from "vitest";
import {
  captureException,
  captureMessage,
  configureErrorTracking,
  withErrorTracking,
  type ErrorTrackingProvider,
} from "./error-tracking";

function mockProvider(): ErrorTrackingProvider & {
  calls: { method: string; args: unknown[] }[];
} {
  const calls: { method: string; args: unknown[] }[] = [];
  return {
    calls,
    captureException(error, context) {
      calls.push({ method: "captureException", args: [error, context] });
    },
    captureMessage(message, severity, context) {
      calls.push({ method: "captureMessage", args: [message, severity, context] });
    },
    setUser(userId) {
      calls.push({ method: "setUser", args: [userId] });
    },
    setContext(key, data) {
      calls.push({ method: "setContext", args: [key, data] });
    },
  };
}

describe("captureException", () => {
  it("encaminha Error para o provider", () => {
    const provider = mockProvider();
    configureErrorTracking(provider);

    const err = new Error("falhou");
    captureException(err, { eventId: "evt-1" });

    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]!.method).toBe("captureException");
    expect((provider.calls[0]!.args[0] as Error).message).toBe("falhou");
  });

  it("converte string para captureMessage", () => {
    const provider = mockProvider();
    configureErrorTracking(provider);

    captureException("erro textual");

    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]!.method).toBe("captureMessage");
    expect(provider.calls[0]!.args[0]).toBe("erro textual");
  });

  it("converte valor desconhecido para 'Unknown error'", () => {
    const provider = mockProvider();
    configureErrorTracking(provider);

    captureException(42);

    expect(provider.calls[0]!.args[0]).toBe("Unknown error");
  });
});

describe("captureMessage", () => {
  it("usa severity padrão 'info'", () => {
    const provider = mockProvider();
    configureErrorTracking(provider);

    captureMessage("algo aconteceu");

    expect(provider.calls[0]!.args[1]).toBe("info");
  });
});

describe("withErrorTracking", () => {
  it("propaga erro após capturar", async () => {
    const provider = mockProvider();
    configureErrorTracking(provider);

    const err = new Error("async fail");
    await expect(
      withErrorTracking(() => Promise.reject(err), { action: "test" }),
    ).rejects.toThrow("async fail");

    expect(provider.calls).toHaveLength(1);
  });

  it("retorna valor quando não há erro", async () => {
    const provider = mockProvider();
    configureErrorTracking(provider);

    const result = await withErrorTracking(() => Promise.resolve(42));

    expect(result).toBe(42);
    expect(provider.calls).toHaveLength(0);
  });
});
