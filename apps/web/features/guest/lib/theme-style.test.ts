import { describe, expect, it } from "vitest";
import { cssDasVars, estiloAntiFlash, sanearVars, valorCssSeguro } from "./theme-style";

// Sem hex literal nem cubic-bezier( neste arquivo por design — o guard tools/guards/tokens.mjs escaneia testes também, sem exceção pra fixture, então os exemplos usam formatos reais de CSS (comprimento, rgb(), pilha de fonte, clamp()).

describe("valorCssSeguro", () => {
  it("aceita comprimento, rgb(), clamp() e pilha de fonte — formatos reais dos tokens", () => {
    expect(valorCssSeguro("20px")).toBe(true);
    expect(valorCssSeguro("1rem")).toBe(true);
    expect(valorCssSeguro("rgb(217, 121, 60)")).toBe(true);
    expect(valorCssSeguro("clamp(1.75rem, 4vw, 3rem)")).toBe(true);
    expect(valorCssSeguro('"Instrument Sans", ui-sans-serif, system-ui, sans-serif')).toBe(true);
  });

  it("rejeita valor que fecha o bloco de regra e injeta seletor + url()", () => {
    expect(valorCssSeguro("1rem} .x{background:url(https://evil.example/x)")).toBe(false);
  });

  it("rejeita @import", () => {
    expect(valorCssSeguro("1rem; } @import url(https://evil.example/x.css)")).toBe(false);
  });

  it("rejeita expression() e comentário CSS", () => {
    expect(valorCssSeguro("expression(alert(1))")).toBe(false);
    expect(valorCssSeguro("1rem /* comentario */")).toBe(false);
  });

  it("rejeita tag html embutida", () => {
    expect(valorCssSeguro("</style><script>alert(1)</script>")).toBe(false);
  });
});

describe("sanearVars", () => {
  it("mantém o valor do evento quando é seguro", () => {
    const resultado = sanearVars({ "--acento": "1rem" }, { "--acento": "2rem" });
    expect(resultado["--acento"]).toBe("1rem");
  });

  it("substitui valor inseguro pelo fallback da marca — a var nunca fica ausente", () => {
    const malicioso = "1rem} .x{background:url(https://evil.example/x)";
    const resultado = sanearVars(
      { "--acento": malicioso, "--bg": "20px" },
      { "--acento": "2rem", "--bg": "20px" },
    );

    expect(resultado["--acento"]).toBe("2rem");
    expect(resultado["--bg"]).toBe("20px");
    expect(Object.keys(resultado)).toEqual(["--acento", "--bg"]);
  });
});

describe("cssDasVars", () => {
  it("serializa cada par em 'chave: valor;'", () => {
    expect(cssDasVars({ "--bg": "1rem", "--ink": "2rem" })).toBe("--bg: 1rem; --ink: 2rem;");
  });
});

describe("estiloAntiFlash — CSS final nunca carrega injeção, mesmo com identityTokens malicioso", () => {
  it("o valor inseguro é saneado antes de chegar ao <style>: sem chave extra, sem seletor injetado, sem url(), sem @import", () => {
    const malicioso =
      "1rem} .x{background:url(https://evil.example/x)} @import url(https://evil.example/y.css";
    const claroEvento = { "--acento": malicioso, "--bg": "20px" };
    const escuroEvento = { "--acento": "2rem", "--bg": "24px" };
    const fallbackClaro = { "--acento": "2rem", "--bg": "20px" };
    const fallbackEscuro = { "--acento": "2rem", "--bg": "24px" };

    const claroSeguro = sanearVars(claroEvento, fallbackClaro);
    const escuroSeguro = sanearVars(escuroEvento, fallbackEscuro);
    const css = estiloAntiFlash(claroSeguro, escuroSeguro);

    expect(css).not.toContain("url(");
    expect(css).not.toContain("@import");
    expect(css).not.toContain(".x{background");
    expect(css).not.toContain("evil.example");
    expect(css).toContain("--acento: 2rem;");

    // Só as 5 chaves { / } dos 4 blocos do helper — nenhuma sobra do valor malicioso, que teria fechado/reaberto blocos extra (media conta duas, os outros três uma cada).
    expect(css.match(/\{/g)?.length).toBe(5);
    expect(css.match(/\}/g)?.length).toBe(5);
  });
});

describe("o piso de cada superfície", () => {
  // Valores sentinela: o que se verifica aqui é qual bloco a cascata emite,
  // não a cor. Hex literal em teste reprova o guard de tokens, com razão.
  const claro = { "--bg": "var(--sentinela-claro)" };
  const escuro = { "--bg": "var(--sentinela-escuro)" };

  it("no convidado, sem escolha é escuro — e o sistema não tem voz", () => {
    const css = estiloAntiFlash(claro, escuro, ".guest-tema", "dark");

    expect(css).toContain('.guest-tema:not([data-tema="light"]) { --bg: var(--sentinela-escuro); }');
    expect(css).toContain('.guest-tema[data-tema="light"] { --bg: var(--sentinela-claro); }');
    // A festa é à noite; celular configurado em claro não muda o contexto.
    expect(css).not.toContain("prefers-color-scheme");
  });

  it("no painel, sem escolha segue o sistema", () => {
    const css = estiloAntiFlash(claro, escuro, ".admin-tema");

    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain('.admin-tema:not([data-tema="dark"]) { --bg: var(--sentinela-claro); }');
  });

  it("escolha explícita vale nas duas superfícies", () => {
    for (const padrao of ["light", "dark"] as const) {
      const css = estiloAntiFlash(claro, escuro, ".x", padrao);
      expect(css).toContain('.x[data-tema="light"] { --bg: var(--sentinela-claro); }');
    }
  });
});
