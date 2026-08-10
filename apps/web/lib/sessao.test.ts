import { describe, expect, it } from "vitest";
import { cabecalhoDeCookie, COOKIE_SESSAO, identidadeParaLimite, tokenDaRequisicao } from "./sessao";

const req = (cookie?: string, cabecalhos: Record<string, string> = {}) =>
  new Request("https://exemplo.test/api/x", {
    headers: cookie ? { cookie, ...cabecalhos } : cabecalhos,
  });

describe("o token vive em cookie, nunca na URL", () => {
  it("o cookie é HttpOnly e SameSite=Lax", () => {
    const c = cabecalhoDeCookie("abc.def", 48);

    expect(c).toContain(`${COOKIE_SESSAO}=abc.def`);
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Max-Age=172800");
  });

  it("lê o token entre outros cookies", () => {
    expect(tokenDaRequisicao(req(`outro=1; ${COOKIE_SESSAO}=abc.def; mais=2`))).toBe("abc.def");
  });

  it("devolve null quando não há cookie nenhum", () => {
    expect(tokenDaRequisicao(req())).toBeNull();
    expect(tokenDaRequisicao(req("outro=1"))).toBeNull();
  });

  it("não se confunde com um cookie de nome parecido", () => {
    expect(tokenDaRequisicao(req(`${COOKIE_SESSAO}_antigo=xxx`))).toBeNull();
  });
});

describe("identidade para rate limit", () => {
  it("usa a sessão quando existe", () => {
    const id = identidadeParaLimite(req(), { eventoId: "e1", sessaoId: "s1" });

    expect(id).toBe("s:s1");
  });

  it("cai para o IP antes de haver sessão", () => {
    const id = identidadeParaLimite(req(undefined, { "cf-connecting-ip": "203.0.113.7" }), null);

    expect(id).toBe("ip:203.0.113.7");
  });

  it("pega só o primeiro IP do x-forwarded-for", () => {
    const id = identidadeParaLimite(
      req(undefined, { "x-forwarded-for": "203.0.113.7, 70.41.3.18" }),
      null,
    );

    expect(id).toBe("ip:203.0.113.7");
  });
});
