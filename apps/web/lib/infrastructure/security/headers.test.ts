import { describe, expect, it } from "vitest";
import { CONTENT_SECURITY_POLICY, GLOBAL_SECURITY_HEADERS } from "./headers";

function header(key: string): string | undefined {
  return GLOBAL_SECURITY_HEADERS.find((h) => h.key === key)?.value;
}

describe("security headers", () => {
  it("bloqueia framing e MIME sniffing", () => {
    expect(header("X-Frame-Options")).toBe("DENY");
    expect(header("X-Content-Type-Options")).toBe("nosniff");
  });

  it("libera camera e microfone só na origem (captura do convidado)", () => {
    expect(header("Permissions-Policy")).toContain("camera=(self)");
    expect(header("Permissions-Policy")).toContain("microphone=(self)");
    expect(header("Permissions-Policy")).toContain("geolocation=()");
  });

  it("define CSP com frame-ancestors none e object-src none", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
  });

  it("ativa HSTS com includeSubDomains", () => {
    expect(header("Strict-Transport-Security")).toContain("max-age=63072000");
    expect(header("Strict-Transport-Security")).toContain("includeSubDomains");
  });
});
