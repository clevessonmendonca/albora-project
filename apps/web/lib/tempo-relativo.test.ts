import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { tempoRelativo } from "./tempo-relativo";

describe("tempoRelativo", () => {
  beforeEach(() => {
    // Fixa data em 2026-08-28 22:00:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T22:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna 'agora' para timestamp < 1min", () => {
    const agora = new Date("2026-08-28T22:00:00Z");
    const há30s = new Date("2026-08-28T21:59:30Z");
    
    expect(tempoRelativo(agora)).toBe("agora");
    expect(tempoRelativo(há30s)).toBe("agora");
  });

  it("retorna 'há Nmin' para timestamp < 1h", () => {
    const há5min = new Date("2026-08-28T21:55:00Z");
    const há45min = new Date("2026-08-28T21:15:00Z");
    
    expect(tempoRelativo(há5min)).toBe("há 5min");
    expect(tempoRelativo(há45min)).toBe("há 45min");
  });

  it("retorna 'há Nh' para timestamp < 24h", () => {
    const há2h = new Date("2026-08-28T20:00:00Z");
    const há12h = new Date("2026-08-28T10:00:00Z");
    
    expect(tempoRelativo(há2h)).toBe("há 2h");
    expect(tempoRelativo(há12h)).toBe("há 12h");
  });

  it("retorna 'DD mmm' para timestamp >= 24h", () => {
    const ontem = new Date("2026-08-27T22:00:00Z");
    
    // toLocaleDateString com pt-BR retorna "27 de ago." ou similar
    const resultado = tempoRelativo(ontem);
    expect(resultado).toMatch(/27/);
    expect(resultado).toMatch(/ago/);
  });

  it("aceita string ISO como input", () => {
    const há10min = "2026-08-28T21:50:00Z";
    expect(tempoRelativo(há10min)).toBe("há 10min");
  });

  it("retorna vazio para data inválida", () => {
    expect(tempoRelativo("data-invalida")).toBe("");
    expect(tempoRelativo("")).toBe("");
  });
});
