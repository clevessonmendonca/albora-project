import { describe, expect, it, vi } from "vitest";

vi.mock("expo-background-fetch", () => ({
  BackgroundFetchStatus: { Restricted: 1, Denied: 2, Available: 3 },
}));

import { rotuloBackgroundFetch } from "./background-status";

describe("rotuloBackgroundFetch", () => {
  it("negado", () => {
    expect(rotuloBackgroundFetch(2).rotulo).toContain("Negado");
  });

  it("ativo", () => {
    expect(rotuloBackgroundFetch(3).rotulo).toBe("Ativo");
  });

  it("null", () => {
    expect(rotuloBackgroundFetch(null).rotulo).toContain("Indisponível");
  });
});
