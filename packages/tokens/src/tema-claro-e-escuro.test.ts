import { describe, expect, it } from "vitest";
import { ALBORA_BRAND } from "./marca";
import { resolveTokens } from "./resolver";
import { toVariables } from "./outputs";

const vars = (background: "light" | "dark") =>
  toVariables(resolveTokens({ marca: ALBORA_BRAND, pack: { background } })) as Record<
    string,
    string
  >;

/** O painel do anfitrião passou a oferecer tema escuro derivando daqui. Se a marca deixar de ter um escuro próprio, o painel cai num tema que não é dele. */
describe("a marca tem um escuro próprio", () => {
  it("fundo e tinta trocam entre claro e escuro", () => {
    const claro = vars("light");
    const escuro = vars("dark");

    expect(escuro["--bg"]).not.toBe(claro["--bg"]);
    expect(escuro["--ink"]).not.toBe(claro["--ink"]);
  });

  it("o escuro é quente, não preto de painel técnico", () => {
    const fundo = vars("dark")["--bg"] ?? "";
    const [, r, g, b] = /^#(\w\w)(\w\w)(\w\w)$/.exec(fundo) ?? [];

    expect(fundo).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(parseInt(r!, 16)).toBeGreaterThan(parseInt(b!, 16));
    expect(g).toBeDefined();
  });

  it("o acento da marca não muda com o tema: identidade não depende de preferência", () => {
    expect(vars("dark")["--acento"]).toBe(vars("light")["--acento"]);
  });
});
