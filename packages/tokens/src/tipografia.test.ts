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
    expect(ESCALA_TIPOGRAFICA.label.tracking).toBe("0.05em");
    expect(ESCALA_TIPOGRAFICA.display.tracking).toBe("-0.02em");
  });

  it("body sai da fonte de corpo", () => {
    expect(ESCALA_TIPOGRAFICA.body.fonte).toBe("corpo");
  });

  it("TYPE_SCALE é alias de ESCALA_TIPOGRAFICA", () => {
    expect(TYPE_SCALE).toBe(ESCALA_TIPOGRAFICA);
  });
});
