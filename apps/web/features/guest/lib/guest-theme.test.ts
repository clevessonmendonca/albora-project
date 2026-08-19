import { describe, expect, it } from "vitest";
import { cookieParaEscolha, escolhaDoDataset } from "./guest-theme";
import { THEME_COOKIE } from "./theme-preference";

describe("escolhaDoDataset", () => {
  it("lê 'light' e 'dark' do data-tema", () => {
    expect(escolhaDoDataset("light")).toBe("light");
    expect(escolhaDoDataset("dark")).toBe("dark");
  });

  it("sem data-tema volta 'system'", () => {
    expect(escolhaDoDataset(undefined)).toBe("system");
  });

  it("valor fora do conjunto fechado também volta 'system' — fail closed, nunca propaga lixo pro data-tema", () => {
    expect(escolhaDoDataset("xpto")).toBe("system");
  });
});

describe("cookieParaEscolha", () => {
  it("'light' grava o cookie com um ano de validade", () => {
    const cookie = cookieParaEscolha("light");
    expect(cookie).toContain(`${THEME_COOKIE}=light;`);
    expect(cookie).toContain("max-age=31536000");
  });

  it("'dark' grava o cookie com um ano de validade", () => {
    const cookie = cookieParaEscolha("dark");
    expect(cookie).toContain(`${THEME_COOKIE}=dark;`);
    expect(cookie).toContain("max-age=31536000");
  });

  it("'system' apaga o cookie — sem valor, max-age=0", () => {
    const cookie = cookieParaEscolha("system");
    expect(cookie).toContain(`${THEME_COOKIE}=;`);
    expect(cookie).toContain("max-age=0");
  });

  it("as 3 opções preservam SameSite=Lax e Secure", () => {
    for (const escolha of ["light", "dark", "system"] as const) {
      const cookie = cookieParaEscolha(escolha);
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Secure");
      expect(cookie).toContain("path=/");
    }
  });
});
