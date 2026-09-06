import { expect, test } from "@playwright/test";

const REF = "e".repeat(24);

/**
 * Afere o `Set-Cookie` da resposta de navegação, não o cookie guardado pelo
 * browser. O middleware emite `albora_ref` com `Secure` quando NODE_ENV é
 * produção (o que `next start` força no CI), mas o servidor de teste roda em
 * http://localhost: o Chromium guarda cookie Secure sobre http no localhost,
 * o WebKit (projeto "mobile" = iPhone 13) não — e recusaria calado. Aferir o
 * header prova o que o produto faz — o middleware manda o cookie certo — sem
 * depender do quirk de armazenamento http-no-localhost, e passa nos dois
 * engines. Em produção (HTTPS) o iOS Safari guarda normalmente.
 */
type HeaderPair = { name: string; value: string };

function setCookieHeaders(res: { headersArray(): HeaderPair[] } | null): string[] {
  return (res?.headersArray() ?? [])
    .filter((h) => h.name.toLowerCase() === "set-cookie")
    .map((h) => h.value);
}

test.describe("Loop viral — ref inbound", () => {
  test.describe.configure({ mode: "serial" });

  test("ref válido vira cookie albora_ref e o beacon envia originRef", async ({ page }) => {
    const beacon = page.waitForRequest(
      (r) => r.url().endsWith("/api/analytics/product") && r.method() === "POST",
      { timeout: 30_000 },
    );
    const res = await page.goto(`/?ref=${REF}`);
    const req = await beacon;
    const body = req.postDataJSON() as { name: string; originRef: string | null };
    expect(body.name).toBe("landing_view");
    expect(body.originRef).toBe(REF);

    const refCookie = setCookieHeaders(res).find((v) => v.startsWith("albora_ref="));
    expect(refCookie).toContain(`albora_ref=${REF}`);
    expect(refCookie?.toLowerCase()).toContain("httponly");
    expect(refCookie?.toLowerCase()).toContain("samesite=lax");
  });

  test("ref inválido não seta cookie e o beacon envia null", async ({ page }) => {
    const beacon = page.waitForRequest(
      (r) => r.url().endsWith("/api/analytics/product") && r.method() === "POST",
      { timeout: 30_000 },
    );
    const res = await page.goto("/?ref=abc");
    const body = (await beacon).postDataJSON() as { name: string; originRef: string | null };
    expect(body.name).toBe("landing_view");
    expect(body.originRef).toBeNull();
    expect(setCookieHeaders(res).some((v) => v.startsWith("albora_ref="))).toBe(false);
  });
});
