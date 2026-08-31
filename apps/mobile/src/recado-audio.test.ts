import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-av", () => ({
  Audio: {
    setAudioModeAsync: vi.fn(async () => undefined),
    Sound: {
      createAsync: vi.fn(),
    },
  },
}));

import { tocarUrl } from "./recado-audio";

describe("tocarUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna controles quando o som carrega", async () => {
    const unloadAsync = vi.fn(async () => undefined);
    const stopAsync = vi.fn(async () => undefined);
    const setOnPlaybackStatusUpdate = vi.fn();
    const createSound = vi.fn(async () => ({
      sound: { unloadAsync, stopAsync, setOnPlaybackStatusUpdate },
    }));

    const ctrl = await tocarUrl("https://example.com/a.m4a", {
      createSound: createSound as never,
      setAudioMode: vi.fn(async () => undefined) as never,
    });
    expect(ctrl).not.toBeNull();
    await ctrl!.parar();
    expect(stopAsync).toHaveBeenCalled();
    expect(unloadAsync).toHaveBeenCalled();
  });

  it("retorna null em falha (soft)", async () => {
    const createSound = vi.fn(async () => {
      throw new Error("boom");
    });
    const statuses: string[] = [];
    const ctrl = await tocarUrl("https://example.com/a.m4a", {
      createSound: createSound as never,
      setAudioMode: vi.fn(async () => undefined) as never,
      onStatus: (s) => statuses.push(s),
    });
    expect(ctrl).toBeNull();
    expect(statuses).toContain("erro");
  });
});
