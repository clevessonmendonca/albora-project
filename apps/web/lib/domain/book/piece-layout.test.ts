import { ALBORA_BRAND, BLEED_MM, SAFE_AREA_MM, pieceMeasures } from "@albora/tokens";
import { describe, expect, it } from "vitest";
import { PIECE_INSTRUCTION, planPiece } from "./piece-layout";

const entradaBase = {
  urlQr: "https://albora.app/e/festa-demo?via=qr",
  urlLegivel: "albora.app/e/festa-demo",
  monograma: "AJ",
  titulo: "Ana & João",
  data: "12 de agosto de 2026",
  cores: ALBORA_BRAND.cores,
};

const quatroDoPack = [
  "A chegada de quem você não via há tempos",
  "A sua mesa, do jeito que ela está agora",
  "Alguém dançando como se ninguém visse",
  "O brinde, no instante do brinde",
];

function valores(formato: "placa-a4" | "card-de-mesa" | "card-de-missao", missoes = quatroDoPack) {
  return planPiece({ ...entradaBase, formato, missoes }).textos.map((t) => t.value);
}

describe("planPiece — missões destacadas", () => {
  it("a placa A4 traz as 4 missões do editor, QR e URL intactos", () => {
    const plano = planPiece({ ...entradaBase, formato: "placa-a4", missoes: quatroDoPack });
    const textos = plano.textos.map((t) => t.value);

    expect(plano.problemas).toEqual([]);
    expect(plano.qrFundo.lado).toBe(pieceMeasures("placa-a4").qr);
    expect(textos).toContain(entradaBase.urlLegivel);
    expect(textos).toContain(PIECE_INSTRUCTION);
    expect(textos).not.toContain("via=qr");
    for (const titulo of quatroDoPack) {
      expect(textos).toContain(titulo);
    }

    const corte = plano.corte;
    for (const t of plano.textos) {
      expect(t.y).toBeGreaterThan(BLEED_MM + SAFE_AREA_MM);
      expect(t.y).toBeLessThan(corte.altura - BLEED_MM - SAFE_AREA_MM);
    }
  });

  it("a sétima missão fica de fora da placa; o card de mesa para em 4", () => {
    const oito = [...quatroDoPack, "cinco", "seis", "sete", "oito"];
    expect(valores("placa-a4", oito)).toContain("seis");
    expect(valores("placa-a4", oito)).not.toContain("sete");
    expect(valores("card-de-mesa", oito)).toContain("O brinde, no instante do brinde");
    expect(valores("card-de-mesa", oito)).not.toContain("cinco");
    expect(valores("card-de-missao", oito)).not.toContain("A chegada de quem você não via há tempos");
  });

  it("sem missões escolhidas a peça não inventa título", () => {
    const textos = valores("placa-a4", []);
    expect(textos).toContain(entradaBase.urlLegivel);
    expect(textos.some((v) => quatroDoPack.includes(v))).toBe(false);
  });

  it("se a lista aperta, reduz o tipo e não tira QR nem URL", () => {
    const longas = Array.from({ length: 6 }, (_, i) =>
      `Missão ${i + 1} com um título longo o bastante para quebrar em mais de uma linha na placa`,
    );
    const plano = planPiece({ ...entradaBase, formato: "placa-a4", missoes: longas });
    const textos = plano.textos.map((t) => t.value);

    expect(plano.qrFundo.lado).toBe(90);
    expect(textos).toContain(entradaBase.urlLegivel);
    expect(textos).toContain(PIECE_INSTRUCTION);
    expect(textos.some((v) => v.includes("Missão 1"))).toBe(true);
    expect(textos.some((v) => v.includes("Missão 6"))).toBe(true);

    const missao = plano.textos.find((t) => t.value.includes("Missão"));
    expect(missao).toBeDefined();
    expect(missao?.size).toBeLessThanOrEqual(4.2);
  });
});
