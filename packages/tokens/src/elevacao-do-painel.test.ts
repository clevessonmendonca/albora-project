import { describe, expect, it } from "vitest";
import { contraste, lerHex } from "./cor";
import { escalaDoFundo } from "./escalas";
import { ALBORA_BRAND } from "./marca";

/**
 * §6: "No escuro, sombra quase não lê. A elevação vem da superfície clarear."
 *
 * A rampa escura é calibrada para o convidado e o telão, onde a foto é a
 * interface e o cromo cede — 1,07:1 entre cartão e página é pouco para
 * enxergar, e é exatamente o que se quer lá.
 *
 * O painel no escuro não tem foto competindo: tem cartão, tabela e fila de
 * moderação, e quem opera precisa ver onde um bloco termina e o outro começa.
 * Daí a rampa própria — não um tema próprio, só a distância entre os degraus.
 */

const razao = (a: string, b: string) => {
  const x = lerHex(a);
  const y = lerHex(b);
  if (!x || !y) throw new Error(`cor ilegível: ${a} / ${b}`);
  return contraste(x, y);
};

/** Abaixo disto o cartão encosta no fundo e a tela vira um plano só. */
const SEPARACAO_MINIMA = 1.25;

describe("no escuro, o painel separa cartão de página", () => {
  it("a rampa de trabalho afasta a superfície do fundo", () => {
    const painel = escalaDoFundo(ALBORA_BRAND.cores, "dark", { elevacao: "trabalho" });
    expect(razao(painel.superficie, painel.bg)).toBeGreaterThanOrEqual(SEPARACAO_MINIMA);
  });

  it("superfície alta continua acima da superfície", () => {
    const painel = escalaDoFundo(ALBORA_BRAND.cores, "dark", { elevacao: "trabalho" });
    expect(razao(painel.superficieAlta, painel.bg)).toBeGreaterThan(
      razao(painel.superficie, painel.bg),
    );
  });

  it("a rampa do convidado NÃO muda — lá o cromo cede à foto", () => {
    const convidado = escalaDoFundo(ALBORA_BRAND.cores, "dark");
    const padrao = escalaDoFundo(ALBORA_BRAND.cores, "dark", { elevacao: "foto" });
    expect(convidado).toEqual(padrao);
    expect(razao(convidado.superficie, convidado.bg)).toBeLessThan(SEPARACAO_MINIMA);
  });

  it("o claro não é afetado — ali a sombra faz o trabalho", () => {
    const semOpcao = escalaDoFundo(ALBORA_BRAND.cores, "light");
    const comTrabalho = escalaDoFundo(ALBORA_BRAND.cores, "light", { elevacao: "trabalho" });
    expect(comTrabalho).toEqual(semOpcao);
  });

  it("o texto continua legível sobre a superfície mais clara", () => {
    const painel = escalaDoFundo(ALBORA_BRAND.cores, "dark", { elevacao: "trabalho" });
    expect(razao(painel.ink, painel.superficieAlta)).toBeGreaterThanOrEqual(4.5);
    expect(razao(painel.ink2, painel.superficieAlta)).toBeGreaterThanOrEqual(4.5);
  });
});
