import { describe, expect, it } from "vitest";
import { CONTRASTE_DE_TEXTO, contraste, lerHex } from "./cor";
import { ALBORA_BRAND } from "./marca";
import { MODELOS_DE_IDENTIDADE } from "./modelos";
import { resolveTokens } from "./resolver";
import { toVariables } from "./outputs";

/**
 * A rampa de neutros é proporção fixa sobre a base (§2). A proporção sobrevive
 * à troca de CHÃO, que é o que o §2 prometeu — mas não à troca de TINTA: 76%
 * de `#171513` sobre papel lê; 76% de um verde médio escolhido pelo casal não.
 *
 * O acento já tem piso de leitura (`acentoLegivelSobre`). Os neutros e o texto
 * sobre o preenchimento não tinham, e é por eles que a identidade do casal
 * entrava reprovando AA na tela do anfitrião.
 */

const razao = (a: string, b: string) => {
  const x = lerHex(a);
  const y = lerHex(b);
  if (!x || !y) throw new Error(`cor ilegível: ${a} / ${b}`);
  return contraste(x, y);
};

const escalaDe = (camada: Record<string, unknown>, background: "light" | "dark") => {
  const { fundo: _f, background: _b, ...semFundo } = camada;
  return toVariables(
    resolveTokens({
      marca: ALBORA_BRAND,
      pack: { background },
      evento: semFundo as never,
    }),
  ) as Record<string, string>;
};

describe("toda identidade do catálogo permanece legível", () => {
  for (const modelo of MODELOS_DE_IDENTIDADE) {
    for (const background of ["light", "dark"] as const) {
      describe(`${modelo.nome} no ${background === "light" ? "claro" : "escuro"}`, () => {
        const v = () => escalaDe(modelo.camada as Record<string, unknown>, background);

        it("texto secundário alcança AA contra a página e o cartão", () => {
          const s = v();
          expect(razao(s["--ink-2"]!, s["--bg"]!)).toBeGreaterThanOrEqual(CONTRASTE_DE_TEXTO);
          expect(razao(s["--ink-2"]!, s["--superficie"]!)).toBeGreaterThanOrEqual(
            CONTRASTE_DE_TEXTO,
          );
        });

        it("texto terciário alcança AA contra a página e o cartão", () => {
          const s = v();
          expect(razao(s["--ink-3"]!, s["--bg"]!)).toBeGreaterThanOrEqual(CONTRASTE_DE_TEXTO);
          expect(razao(s["--ink-3"]!, s["--superficie"]!)).toBeGreaterThanOrEqual(
            CONTRASTE_DE_TEXTO,
          );
        });

        it("secundário e terciário continuam sendo dois degraus", () => {
          const s = v();
          // O piso de leitura empurra os dois para cima; sem cuidado eles
          // convergem no mínimo e a rampa vira um degrau só.
          const doSecundario = razao(s["--ink-2"]!, s["--bg"]!);
          const doTerciario = razao(s["--ink-3"]!, s["--bg"]!);
          expect(doSecundario).toBeGreaterThan(doTerciario * 1.05);
        });

        it("o rótulo do botão primário alcança AA sobre o preenchimento", () => {
          const s = v();
          expect(razao(s["--sobre-acento"]!, s["--acento"]!)).toBeGreaterThanOrEqual(
            CONTRASTE_DE_TEXTO,
          );
        });
      });
    }
  }
});
