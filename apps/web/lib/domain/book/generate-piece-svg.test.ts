import { ALBORA_BRAND } from "@albora/tokens";
import { describe, expect, it } from "vitest";
import { generatePieceSvg } from "./generate-piece-svg";
import { PIECE_INSTRUCTION } from "./piece-layout";

const entradaBase = {
  urlQr: "https://albora.app/e/festa-demo",
  urlLegivel: "albora.app/e/festa-demo",
  monograma: "AJ",
  titulo: "Ana & João",
  data: "12 de agosto de 2026",
  cores: ALBORA_BRAND.cores,
};

describe("generatePieceSvg", () => {
  it("aprova placa A4 e devolve SVG com QR e URL", async () => {
    const resultado = await generatePieceSvg({ ...entradaBase, formato: "placa-a4" });

    expect(resultado.problemas).toEqual([]);
    expect(resultado.svg).toContain("<svg");
    expect(resultado.svg).toContain("albora.app/e/festa-demo");
    expect(resultado.svg).toContain(PIECE_INSTRUCTION);
    expect(resultado.avisos.length).toBeGreaterThan(0);
  });

  it("placa A4 imprime as missões do editor e não inventa título", async () => {
    const missoes = [
      "A chegada de quem você não via há tempos",
      "A sua mesa, do jeito que ela está agora",
      "Alguém dançando como se ninguém visse",
      "O brinde, no instante do brinde",
    ];
    const resultado = await generatePieceSvg({
      ...entradaBase,
      formato: "placa-a4",
      missoes: [...missoes, "cinco", "seis", "missão que não cabe"],
    });

    expect(resultado.problemas).toEqual([]);
    for (const titulo of missoes) {
      expect(resultado.svg).toContain(titulo);
    }
    expect(resultado.svg).not.toContain("missão que não cabe");
    expect(resultado.svg).toContain("albora.app/e/festa-demo");
  });

  it("via=qr no QR não aparece na URL impressa", async () => {
    const resultado = await generatePieceSvg({
      ...entradaBase,
      formato: "placa-a4",
      urlQr: "https://albora.app/e/festa-demo?via=qr",
    });

    expect(resultado.problemas).toEqual([]);
    expect(resultado.svg).toContain("albora.app/e/festa-demo");
    expect(resultado.svg).not.toContain("via=qr");
  });

  it("recusa peça sem URL legível", async () => {
    const resultado = await generatePieceSvg({
      ...entradaBase,
      formato: "card-de-missao",
      urlLegivel: "",
    });

    expect(resultado.problemas.length).toBeGreaterThan(0);
    expect(resultado.svg).toBe("");
  });

  it("gera os três formatos válidos", async () => {
    for (const formato of ["placa-a4", "card-de-mesa", "card-de-missao"] as const) {
      const resultado = await generatePieceSvg({ ...entradaBase, formato });
      expect(resultado.problemas).toEqual([]);
      expect(resultado.svg).toContain("<rect");
    }
  });
});
