import { describe, expect, it } from "vitest";
import { ALBORA_BRAND } from "./marca";
import { resolveTokens } from "./resolver";
import { toVariables } from "./outputs";

const vars = (background: "light" | "dark") =>
  toVariables(resolveTokens({ marca: ALBORA_BRAND, pack: { background } })) as Record<
    string,
    string
  >;

/**
 * As sombras moravam no CSS, declaradas em `:root`. Como elas derivam de
 * `--ink` e o `--ink` só existe no wrapper por-evento, `var(--ink)` resolvia
 * vazio no ponto da declaração e a propriedade inteira herdava inválida — toda
 * a profundidade do produto computava `none`. Nascendo aqui, elas chegam no
 * mesmo elemento que `--ink`.
 */
describe("sombra sai da mesma camada que a tinta", () => {
  it("toVariables emite as sombras ao lado de --ink", () => {
    const v = vars("light");

    expect(v["--ink"]).toBeTruthy();
    for (const nome of [
      "--sombra-suave",
      "--sombra-alta",
      "--sombra-acento",
      "--sombra-device",
      "--sombra-polaroide",
    ]) {
      expect(v[nome], `${nome} ausente`).toBeTruthy();
    }
  });

  it("cada sombra referencia a tinta do evento, não um preto fixo", () => {
    const v = vars("light");

    for (const nome of ["--sombra-suave", "--sombra-alta", "--sombra-device"]) {
      expect(v[nome]).toContain("var(--ink)");
      // §6: "A sombra é marrom-quente, nunca preta."
      expect(v[nome]).not.toMatch(/rgba?\(\s*0\s*,\s*0\s*,\s*0/);
    }
  });

  it("o acento manda na sombra do acento", () => {
    expect(vars("light")["--sombra-acento"]).toContain("var(--acento)");
  });

  it("claro e escuro produzem o mesmo contrato de sombra", () => {
    const claro = vars("light");
    const escuro = vars("dark");

    expect(Object.keys(claro).filter((k) => k.startsWith("--sombra-"))).toEqual(
      Object.keys(escuro).filter((k) => k.startsWith("--sombra-")),
    );
  });
});
