import { describe, expect, it } from "vitest";
import { ESCALA_TIPOGRAFICA, TYPE_SCALE } from "./tipografia";

describe("escala tipográfica", () => {
  it("cobre os sete papéis", () => {
    expect(Object.keys(ESCALA_TIPOGRAFICA).sort()).toEqual(
      ["body", "bodyLg", "caption", "display", "label", "subtitle", "title"].sort(),
    );
  });

  it("display usa a fonte de título com peso baixo (delicadeza em tamanho grande)", () => {
    expect(ESCALA_TIPOGRAFICA.display.fonte).toBe("titulo");
    expect(ESCALA_TIPOGRAFICA.display.peso).toBeLessThanOrEqual(400);
  });

  it("label abre o tracking; display fecha", () => {
    expect(ESCALA_TIPOGRAFICA.label.tracking).toBe("0.28em");
    expect(ESCALA_TIPOGRAFICA.display.tracking).toBe("-0.014em");
  });

  /** §3: "O rótulo é versalete serifado, nunca mono" — é o gesto que amarra a tela à papelaria. */
  it("o rótulo é versalete serifado, em caixa alta", () => {
    expect(ESCALA_TIPOGRAFICA.label.fonte).toBe("titulo");
    expect(ESCALA_TIPOGRAFICA.label.caixaAlta).toBe(true);
    expect(ESCALA_TIPOGRAFICA.label.peso).toBe(400);
  });

  /** §3: "Peso máximo do Fraunces: 500, e só na superfície do convidado. Landing e admin ficam em 300." */
  it("nenhum papel de display passa de 300 — o peso do convidado vem da superfície", () => {
    for (const papel of ["display", "title", "subtitle"] as const) {
      expect(ESCALA_TIPOGRAFICA[papel].peso, papel).toBe(300);
    }
  });

  /** §3: "o corpo tem entrelinha 1,68, não 1,5. Ar entre linhas é metade da delicadeza." */
  it("o corpo respira 1,68", () => {
    expect(ESCALA_TIPOGRAFICA.body.entrelinha).toBeGreaterThanOrEqual(1.68);
    expect(ESCALA_TIPOGRAFICA.caption.entrelinha).toBeGreaterThanOrEqual(1.68);
  });

  it("body sai da fonte de corpo", () => {
    expect(ESCALA_TIPOGRAFICA.body.fonte).toBe("corpo");
  });

  it("TYPE_SCALE é alias de ESCALA_TIPOGRAFICA", () => {
    expect(TYPE_SCALE).toBe(ESCALA_TIPOGRAFICA);
  });
});
