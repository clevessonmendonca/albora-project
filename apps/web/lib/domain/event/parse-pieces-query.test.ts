import { describe, expect, it } from "vitest";
import { parsePiecesQuery, PIECE_TYPES } from "./parse-pieces-query";
import { PRINT_FORMATS } from "../book/pack-print-pieces";

describe("parsePiecesQuery", () => {
  it("tipo=zip não exige formato e o SVG fica opt-in", () => {
    expect(parsePiecesQuery(new URLSearchParams("tipo=zip"))).toEqual({
      ok: true,
      kind: "zip",
      includeSvg: false,
    });
    expect(parsePiecesQuery(new URLSearchParams("tipo=zip&svg=1"))).toEqual({
      ok: true,
      kind: "zip",
      includeSvg: true,
    });
    expect(parsePiecesQuery(new URLSearchParams("tipo=zip&svg=true"))).toEqual({
      ok: true,
      kind: "zip",
      includeSvg: false,
    });
  });

  it("peça única continua exigindo formato", () => {
    expect(parsePiecesQuery(new URLSearchParams("formato=placa-a4&tipo=pdf"))).toEqual({
      ok: true,
      kind: "single",
      formato: "placa-a4",
      tipo: "pdf",
    });
    expect(parsePiecesQuery(new URLSearchParams("tipo=pdf"))).toEqual({
      ok: false,
      campo: "formato",
      aceitos: PRINT_FORMATS,
    });
  });

  it("sem tipo ainda gera SVG, tipo inválido 422", () => {
    expect(parsePiecesQuery(new URLSearchParams("formato=card-de-mesa"))).toEqual({
      ok: true,
      kind: "single",
      formato: "card-de-mesa",
      tipo: "svg",
    });
    expect(parsePiecesQuery(new URLSearchParams("tipo=docx"))).toEqual({
      ok: false,
      campo: "tipo",
      aceitos: PIECE_TYPES,
    });
  });
});
