import { expect, test } from "@playwright/test";

test.describe("security headers", () => {
  test("landing envia headers de proteção", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers()["content-security-policy"]).toContain("object-src 'none'");
  });
});

test.describe("health checks", () => {
  test("live responde sem depender do banco", async ({ request }) => {
    const res = await request.get("/api/health/live");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("alive");
  });

  test("GET /api/health é alias de liveness", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("alive");
  });
});
