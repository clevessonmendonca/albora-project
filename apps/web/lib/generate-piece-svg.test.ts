import { MARCA_ALBORA } from "@albora/tokens";
import { describe, expect, it } from "vitest";
import { generatePieceSvg } from "./generate-piece-svg";

const entradaBase = {
  urlQr: "https://albora.app/e/festa-demo",
  urlLegivel: "albora.app/e/festa-demo",
  monograma: "AJ",
  titulo: "Ana & João",
  data: "12 de agosto de 2026",
  cores: MARCA_ALBORA.cores,
};

describe("generatePieceSvg", () => {
  it("aprova placa A4 e devolve SVG com QR e URL", async () => {
    const resultado = await generatePieceSvg({ ...entradaBase, formato: "placa-a4" });

    expect(resultado.problemas).toEqual([]);
    expect(resultado.svg).toContain("<svg");
    expect(resultado.svg).toContain("albora.app/e/festa-demo");
    expect(resultado.avisos.length).toBeGreaterThan(0);
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
