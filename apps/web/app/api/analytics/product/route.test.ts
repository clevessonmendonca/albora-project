import { describe, expect, it, vi, beforeEach } from "vitest";

const { poolQuery } = vi.hoisted(() => ({ poolQuery: vi.fn().mockResolvedValue({ rows: [] }) }));
vi.mock("@/lib/db", () => ({ getPool: () => ({ query: poolQuery }) }));

const { POST } = await import("./route");

function req(body: unknown) {
  return new Request("https://exemplo.test/api/analytics/product", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analytics/product — originRef", () => {
  beforeEach(() => poolQuery.mockClear());

  it("grava originRef válido", async () => {
    const ref = "r".repeat(24);
    const res = await POST(req({ name: "landing_cta", anonId: "a1", packHint: "casamento", originRef: ref }));
    expect(res.status).toBe(200);
    const params = poolQuery.mock.calls[0]![1] as unknown[];
    expect(params[3]).toBe(ref);
  });

  it("originRef inválido vira null, sem rejeitar", async () => {
    const res = await POST(req({ name: "landing_view", originRef: "curto" }));
    expect(res.status).toBe(200);
    expect((poolQuery.mock.calls[0]![1] as unknown[])[3]).toBeNull();
  });

  it("aceita evento guest_* ", async () => {
    const res = await POST(req({ name: "guest_share_album", originRef: "g".repeat(24) }));
    expect(res.status).toBe(200);
    expect((poolQuery.mock.calls[0]![1] as unknown[])[0]).toBe("guest_share_album");
  });

  it("nome inválido continua 422", async () => {
    const res = await POST(req({ name: "guest.qualquer" }));
    expect(res.status).toBe(422);
  });
});
