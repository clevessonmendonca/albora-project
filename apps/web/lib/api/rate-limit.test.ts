import { beforeEach, describe, expect, it } from "vitest";
import { reset } from "@/lib/rate-limit-store";
import { enforceRateLimit } from "./rate-limit";

beforeEach(reset);

describe("enforceRateLimit", () => {
  const req = (headers: Record<string, string> = {}) =>
    new Request("https://exemplo.test/api/admin/sessao", {
      method: "POST",
      headers,
    });

  it("devolve null enquanto estiver dentro do teto", () => {
    const r = req({ "cf-connecting-ip": "203.0.113.7" });

    expect(
      enforceRateLimit(r, null, { max: 2, keyPrefix: "admin_sessao:" }),
    ).toBeNull();
    expect(
      enforceRateLimit(r, null, { max: 2, keyPrefix: "admin_sessao:" }),
    ).toBeNull();
  });

  it("devolve 429 quando exceder o teto", async () => {
    const r = req({ "cf-connecting-ip": "203.0.113.9" });

    enforceRateLimit(r, null, { max: 1, keyPrefix: "admin_sessao:" });
    const limited = enforceRateLimit(r, null, {
      max: 1,
      keyPrefix: "admin_sessao:",
      message: "Muitas tentativas",
    });

    expect(limited).not.toBeNull();
    expect(limited!.status).toBe(429);

    const corpo = (await limited!.json()) as {
      code: string;
      message: string;
      details?: { retry_after_seconds?: number };
    };
    expect(corpo.code).toBe("limite.excedido");
    expect(corpo.message).toBe("Muitas tentativas");
    expect(corpo.details?.retry_after_seconds).toBeGreaterThan(0);
    expect(limited!.headers.get("Retry-After")).toBe(
      String(corpo.details?.retry_after_seconds),
    );
  });

  it("prefixos diferentes não compartilham bucket", () => {
    const r = req({ "cf-connecting-ip": "203.0.113.10" });

    enforceRateLimit(r, null, { max: 1, keyPrefix: "admin_sessao:" });
    expect(
      enforceRateLimit(r, null, { max: 1, keyPrefix: "admin_sair:" }),
    ).toBeNull();
  });
});
