import { describe, expect, it } from "vitest";
import {
  GUEST_SESSION_COOKIE,
  limitIdentity,
  sessionCookieHeader,
  tokenFromRequest,
} from "./session";

const req = (cookie?: string, headers: Record<string, string> = {}) =>
  new Request("https://exemplo.test/api/x", {
    headers: cookie ? { cookie, ...headers } : headers,
  });

describe("o token vive em cookie, nunca na URL", () => {
  it("o cookie é HttpOnly e SameSite=Lax", () => {
    const c = sessionCookieHeader("abc.def", 48);

    expect(c).toContain(`${GUEST_SESSION_COOKIE}=abc.def`);
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Max-Age=172800");
  });

  it("lê o token entre outros cookies", () => {
    expect(tokenFromRequest(req(`outro=1; ${GUEST_SESSION_COOKIE}=abc.def; mais=2`))).toBe(
      "abc.def",
    );
  });

  it("devolve null quando não há cookie nenhum", () => {
    expect(tokenFromRequest(req())).toBeNull();
    expect(tokenFromRequest(req("outro=1"))).toBeNull();
  });

  it("não se confunde com um cookie de nome parecido", () => {
    expect(tokenFromRequest(req(`${GUEST_SESSION_COOKIE}_antigo=xxx`))).toBeNull();
  });
});

describe("identidade para rate limit", () => {
  it("usa a sessão quando existe", () => {
    const id = limitIdentity(req(), { eventoId: "e1", sessaoId: "s1" });

    expect(id).toBe("s:s1");
  });

  it("cai para o IP antes de haver sessão", () => {
    const id = limitIdentity(req(undefined, { "cf-connecting-ip": "203.0.113.7" }), null);

    expect(id).toBe("ip:203.0.113.7");
  });

  it("pega só o primeiro IP do x-forwarded-for", () => {
    const id = limitIdentity(
      req(undefined, { "x-forwarded-for": "203.0.113.7, 70.41.3.18" }),
      null,
    );

    expect(id).toBe("ip:203.0.113.7");
  });
});
