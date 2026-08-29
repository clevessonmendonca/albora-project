import { describe, expect, it, vi } from "vitest";
import { IDENTITY_MODELS } from "@albora/tokens";
import { normalizarBackground, presetParaCores } from "./use-create-event-wizard";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

describe("normalizarBackground", () => {
  it("aceita light e claro", () => {
    expect(normalizarBackground("light")).toBe("light");
    expect(normalizarBackground("claro")).toBe("light");
  });

  it("qualquer outro valor vira dark", () => {
    expect(normalizarBackground("dark")).toBe("dark");
    expect(normalizarBackground(undefined)).toBe("dark");
  });
});

describe("presetParaCores", () => {
  it("devolve acento, base e texto do modelo", () => {
    const modelo = IDENTITY_MODELS[0]!;
    const cores = presetParaCores(modelo);
    expect(cores.acento).toBeTruthy();
    expect(cores.base).toBeTruthy();
    expect(cores.texto).toBeTruthy();
    expect(["light", "dark"]).toContain(cores.modo);
  });
});
