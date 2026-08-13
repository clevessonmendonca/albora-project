import { beforeEach, describe, expect, it } from "vitest";
import { consume, reset } from "./rate-limit-store";
import { limitIdentity } from "./session";

beforeEach(reset);

describe("rate limit no portão", () => {
  it("permite até o teto e recusa o excedente", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i += 1) {
      expect(consume("s:1", 3, 60, t0).allowed).toBe(true);
    }
    expect(consume("s:1", 3, 60, t0).allowed).toBe(false);
  });

  it("a janela reabre depois de expirar", () => {
    const t0 = 1_000_000;
    consume("s:1", 1, 60, t0);
    expect(consume("s:1", 1, 60, t0).allowed).toBe(false);
    expect(consume("s:1", 1, 60, t0 + 60_001).allowed).toBe(true);
  });

  it("chaves diferentes não se afetam", () => {
    const t0 = 1_000_000;
    consume("s:1", 1, 60, t0);

    expect(consume("s:1", 1, 60, t0).allowed).toBe(false);
    expect(consume("s:2", 1, 60, t0).allowed).toBe(true);
  });

  it("informa quanto falta para reabrir", () => {
    const t0 = 1_000_000;
    consume("s:1", 1, 60, t0);
    const blocked = consume("s:1", 1, 60, t0 + 30_000);

    expect(blocked.allowed).toBe(false);
    expect(blocked.resetInSeconds).toBe(30);
  });
});

describe("upload confirm compartilha bucket por sessão", () => {
  const req = () => new Request("https://exemplo.test/api/uploads/confirm", { method: "POST" });
  const session = { eventoId: "e1", sessaoId: "s1" };

  it("presign e confirm usam a mesma chave s:sessaoId", () => {
    const t0 = 1_000_000;
    const key = limitIdentity(req(), session);

    expect(key).toBe("s:s1");

    for (let i = 0; i < 3; i += 1) {
      expect(consume(key, 3, 60, t0).allowed).toBe(true);
    }
    expect(consume(key, 3, 60, t0).allowed).toBe(false);
  });
});
