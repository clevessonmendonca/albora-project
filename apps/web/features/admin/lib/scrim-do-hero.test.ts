import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contraste, CONTRASTE_DE_TEXTO, lerHex, type Rgb } from "@albora/tokens";
import { describe, expect, it } from "vitest";
import { adminVars } from "./chrome-do-painel";

/**
 * O hero da Visão geral desenha o nome do evento por cima da capa que o casal
 * escolheu — e a capa é foto arbitrária. Quem garante a legibilidade é o scrim
 * `--background-image-gradient-hero-capa`, não a sorte da foto.
 *
 * Afrouxar as paradas do gradiente é a mudança que parece inofensiva numa
 * captura de tela com foto escura e reprova na primeira foto clara.
 */

const CSS = readFileSync(
  join(__dirname, "..", "..", "..", "app", "tailwind.css"),
  "utf8",
);

/** A metade onde o texto vive. A direita fica de propósito mais aberta: lá só há texto dentro de painel opaco. */
const OPACIDADES_DA_COLUNA_DE_TEXTO = [0, 50];

function paradasDoScrim(): { posicao: number; opacidade: number }[] {
  const bloco = CSS.match(
    /--background-image-gradient-hero-capa:\s*linear-gradient\(([^;]+)\);/,
  );
  if (!bloco) throw new Error("gradiente do hero sumiu do tailwind.css");

  return [...bloco[1]!.matchAll(/var\(--bg\)\s+(\d+)%,\s*transparent\)\s*(\d+)%/g)].map((m) => ({
    opacidade: Number(m[1]) / 100,
    posicao: Number(m[2]),
  }));
}

/** Composição sobre o chão, em espaço gama — que é como o navegador pinta. */
function sobre(frente: Rgb, alpha: number, fundo: Rgb): Rgb {
  return {
    r: Math.round(frente.r * alpha + fundo.r * (1 - alpha)),
    g: Math.round(frente.g * alpha + fundo.g * (1 - alpha)),
    b: Math.round(frente.b * alpha + fundo.b * (1 - alpha)),
  };
}

describe("o scrim do hero segura o texto sobre qualquer capa", () => {
  const vars = adminVars("dark") as unknown as Record<string, string>;
  const chao = lerHex(vars["--bg"]!)!;
  const tinta = lerHex(vars["--ink"]!)!;
  const BRANCO: Rgb = { r: 255, g: 255, b: 255 };
  const PRETO: Rgb = { r: 0, g: 0, b: 0 };

  it("o gradiente declara parada para o começo e para o meio do hero", () => {
    const posicoes = paradasDoScrim().map((p) => p.posicao);

    expect(posicoes).toEqual(expect.arrayContaining(OPACIDADES_DA_COLUNA_DE_TEXTO));
  });

  it("sobre foto branca — o pior caso — o nome do evento passa em AA", () => {
    for (const { posicao, opacidade } of paradasDoScrim()) {
      if (!OPACIDADES_DA_COLUNA_DE_TEXTO.includes(posicao)) continue;

      const composto = sobre(chao, opacidade, BRANCO);

      expect(contraste(tinta, composto), `parada ${posicao}%`).toBeGreaterThan(
        CONTRASTE_DE_TEXTO,
      );
    }
  });

  it("sobre foto preta também, que é o outro extremo", () => {
    for (const { posicao, opacidade } of paradasDoScrim()) {
      if (!OPACIDADES_DA_COLUNA_DE_TEXTO.includes(posicao)) continue;

      const composto = sobre(chao, opacidade, PRETO);

      expect(contraste(tinta, composto), `parada ${posicao}%`).toBeGreaterThan(
        CONTRASTE_DE_TEXTO,
      );
    }
  });

  it("o hero sem capa não vira escuro por engano", () => {
    const claro = adminVars("light") as unknown as Record<string, string>;

    expect(claro["--bg"]).not.toBe(vars["--bg"]);
  });
});
