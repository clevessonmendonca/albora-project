import { beforeEach, describe, expect, it, vi } from "vitest";

const { pedido, redirect } = vi.hoisted(() => ({
  pedido: { valor: null as string | null },
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("next/headers", () => ({
  headers: async () => ({ get: () => pedido.valor }),
}));
vi.mock("next/navigation", () => ({ redirect }));

const { caminhoSeguroDoAdmin, urlDeEntrada, redirecionarParaEntrar } = await import(
  "./admin-sign-in-redirect"
);

beforeEach(() => {
  pedido.valor = null;
  redirect.mockClear();
});

describe("caminhoSeguroDoAdmin", () => {
  it("aceita só caminhos internos do painel", () => {
    expect(caminhoSeguroDoAdmin("/admin")).toBe("/admin");
    expect(caminhoSeguroDoAdmin("/admin/e/abc/ao-vivo")).toBe("/admin/e/abc/ao-vivo");
    expect(caminhoSeguroDoAdmin("/admin/new?plano=celebration")).toBe("/admin/new?plano=celebration");
  });

  it.each([
    "//evil.com",
    "https://evil.com/admin",
    "/admin//evil.com/..:@://x",
    "/adminx",
    "/admin\\evil",
    "/e/festa",
    "evil.com",
    "",
    null,
  ])("recusa %s (open redirect)", (raw) => {
    expect(caminhoSeguroDoAdmin(raw as string | null)).toBeNull();
  });
});

describe("redirecionarParaEntrar", () => {
  it("antes: sessão expirada no deep link ia a /admin/sign-in sem destino; depois: leva o caminho pedido", async () => {
    pedido.valor = "/admin/e/abc/qrcode";
    await expect(redirecionarParaEntrar()).rejects.toThrow(
      `REDIRECT:/admin/sign-in?next=${encodeURIComponent("/admin/e/abc/qrcode")}`,
    );
  });

  it("header forjado com destino externo cai no login limpo", async () => {
    pedido.valor = "//evil.com";
    await expect(redirecionarParaEntrar()).rejects.toThrow("REDIRECT:/admin/sign-in");
    expect(redirect).toHaveBeenCalledWith("/admin/sign-in");
  });

  it("sem header usa o fallback seguro", async () => {
    await expect(redirecionarParaEntrar("/admin/billing")).rejects.toThrow(
      `REDIRECT:/admin/sign-in?next=${encodeURIComponent("/admin/billing")}`,
    );
  });
});

describe("urlDeEntrada", () => {
  it("sem destino válido é o login simples", () => {
    expect(urlDeEntrada("https://x.com")).toBe("/admin/sign-in");
  });
});
