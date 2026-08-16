import { describe, expect, it } from "vitest";
import { cookieHeader, parseRedeemResponse, redeemUrl } from "./session";

describe("resgate do código de 4 dígitos", () => {
  it("aceita o corpo que o handler promete ao nativo", () => {
    expect(
      parseRedeemResponse({ token: "abc.def", slug: "festa-demo", sessaoId: "sess-1" }),
    ).toEqual({ token: "abc.def", slug: "festa-demo", sessaoId: "sess-1" });
  });

  it("recusa resposta sem token — cookie HttpOnly não chega no app", () => {
    expect(parseRedeemResponse({ slug: "festa-demo", sessaoId: "sess-1" })).toBeNull();
  });

  it("o cookie usa o mesmo nome da web", () => {
    expect(cookieHeader("abc.def")).toBe("albora_sessao=abc.def");
  });

  it("o resgate bate no alias PT que já existe", () => {
    expect(redeemUrl()).toMatch(/\/api\/app\/parear\/resgatar$/);
  });
});
