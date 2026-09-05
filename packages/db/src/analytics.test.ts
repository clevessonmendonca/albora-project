import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { isProductEventName, recordProductEvent } from "./analytics";
import { isRefToken, REF_TOKEN_RE } from "./share-attribution";

function poolFalso() {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  return { pool: { query } as unknown as Pool, query };
}

describe("REF_TOKEN_RE / isRefToken", () => {
  it("aceita exatamente 24 chars alfanuméricos", () => {
    expect(isRefToken("a".repeat(24))).toBe(true);
    expect(REF_TOKEN_RE.test("Ab9".repeat(8))).toBe(true);
  });
  it("rejeita tamanho errado, símbolos e não-string", () => {
    expect(isRefToken("a".repeat(23))).toBe(false);
    expect(isRefToken("a".repeat(25))).toBe(false);
    expect(isRefToken("a".repeat(23) + "-")).toBe(false);
    expect(isRefToken(null)).toBe(false);
    expect(isRefToken(42)).toBe(false);
  });
});

describe("recordProductEvent", () => {
  it("grava origin_ref quando informado", async () => {
    const { pool, query } = poolFalso();
    await recordProductEvent(pool, "landing_cta", { anonId: "anon", packHint: "pack-teste", originRef: "x".repeat(24) });
    const [sql, params] = query.mock.calls[0]!;
    expect(sql).toMatch(/origin_ref/);
    expect(params).toEqual(["landing_cta", "anon", "pack-teste", "x".repeat(24)]);
  });
  it("origin_ref é null por padrão", async () => {
    const { pool, query } = poolFalso();
    await recordProductEvent(pool, "landing_view");
    expect(query.mock.calls[0]![1]).toEqual(["landing_view", null, null, null]);
  });
  it("aceita os nomes guest_*", () => {
    expect(isProductEventName("guest_cta_criar_click")).toBe(true);
    expect(isProductEventName("guest_share_album")).toBe(true);
    expect(isProductEventName("guest.qualquer")).toBe(false);
  });
});
