import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware, config } from "./middleware";

const REF = "m".repeat(24);

describe("middleware albora_ref", () => {
  it("ref válido em / seta cookie httpOnly de 30 min", () => {
    const res = middleware(new NextRequest(`https://albora.test/?ref=${REF}`));
    const cookie = res.cookies.get("albora_ref");
    expect(cookie?.value).toBe(REF);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
    expect(cookie?.maxAge).toBe(1800);
  });

  it("ref inválido não seta cookie", () => {
    const res = middleware(new NextRequest("https://albora.test/?ref=abc"));
    expect(res.cookies.get("albora_ref")).toBeUndefined();
  });

  it("sem ref não seta cookie", () => {
    const res = middleware(new NextRequest("https://albora.test/"));
    expect(res.cookies.get("albora_ref")).toBeUndefined();
  });

  it("matcher cobre só as landings", () => {
    expect(config.matcher).toEqual(["/", "/15-anos"]);
  });
});
