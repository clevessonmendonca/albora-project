import { beforeEach, describe, expect, it } from "vitest";
import { consumir, zerar } from "./limite";

beforeEach(zerar);

describe("rate limit no portão", () => {
  it("permite até o teto e recusa o excedente", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i += 1) {
      expect(consumir("s:1", 3, 60, t0).permitido).toBe(true);
    }
    expect(consumir("s:1", 3, 60, t0).permitido).toBe(false);
  });

  it("a janela reabre depois de expirar", () => {
    const t0 = 1_000_000;
    consumir("s:1", 1, 60, t0);
    expect(consumir("s:1", 1, 60, t0).permitido).toBe(false);
    expect(consumir("s:1", 1, 60, t0 + 60_001).permitido).toBe(true);
  });

  it("chaves diferentes não se afetam", () => {
    const t0 = 1_000_000;
    consumir("s:1", 1, 60, t0);

    expect(consumir("s:1", 1, 60, t0).permitido).toBe(false);
    expect(consumir("s:2", 1, 60, t0).permitido).toBe(true);
  });

  it("informa quanto falta para reabrir", () => {
    const t0 = 1_000_000;
    consumir("s:1", 1, 60, t0);
    const bloqueado = consumir("s:1", 1, 60, t0 + 30_000);

    expect(bloqueado.permitido).toBe(false);
    expect(bloqueado.resetEmSegundos).toBe(30);
  });
});
