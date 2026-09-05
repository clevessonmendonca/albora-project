import { expect, test } from "@playwright/test";

const REF = "e".repeat(24);

test.describe("Loop viral — ref inbound", () => {
  test.describe.configure({ mode: "serial" });

  test("ref válido vira cookie albora_ref e o beacon envia originRef", async ({ page, context }) => {
    const beacon = page.waitForRequest(
      (r) => r.url().endsWith("/api/analytics/product") && r.method() === "POST",
      { timeout: 30_000 },
    );
    await page.goto(`/?ref=${REF}`);
    const req = await beacon;
    const body = req.postDataJSON() as { name: string; originRef: string | null };
    expect(body.name).toBe("landing_view");
    expect(body.originRef).toBe(REF);

    const cookie = (await context.cookies()).find((c) => c.name === "albora_ref");
    expect(cookie?.value).toBe(REF);
    expect(cookie?.httpOnly).toBe(true);
  });

  test("ref inválido não seta cookie e o beacon envia null", async ({ page, context }) => {
    const beacon = page.waitForRequest(
      (r) => r.url().endsWith("/api/analytics/product") && r.method() === "POST",
      { timeout: 30_000 },
    );
    await page.goto("/?ref=abc");
    const body = (await beacon).postDataJSON() as { name: string; originRef: string | null };
    expect(body.name).toBe("landing_view");
    expect(body.originRef).toBeNull();
    expect((await context.cookies()).find((c) => c.name === "albora_ref")).toBeUndefined();
  });
});
