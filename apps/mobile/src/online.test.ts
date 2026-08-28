import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-community/netinfo", () => ({
  fetch: vi.fn(),
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
}));

import { onlineFromState } from "./online";

describe("onlineFromState", () => {
  it("offline quando desconectado", () => {
    expect(onlineFromState({ isConnected: false, isInternetReachable: false } as never)).toBe(false);
  });

  it("online quando conectado e reachable", () => {
    expect(onlineFromState({ isConnected: true, isInternetReachable: true } as never)).toBe(true);
  });

  it("online quando reachable ainda null (Wi‑Fi conectando)", () => {
    expect(onlineFromState({ isConnected: true, isInternetReachable: null } as never)).toBe(true);
  });
});
