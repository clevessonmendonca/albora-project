import { describe, it, expect } from "vitest";
import { buildCsv, csvCell, csvRow } from "./csv";

describe("csvCell", () => {
  it("retorna string vazia para null e undefined", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("converte número para string sem aspas", () => {
    expect(csvCell(42)).toBe("42");
    expect(csvCell(0)).toBe("0");
  });

  it("não escapa valor simples", () => {
    expect(csvCell("QR impresso")).toBe("QR impresso");
  });

  it("envolve em aspas quando contém vírgula", () => {
    expect(csvCell("A, B")).toBe('"A, B"');
  });

  it("escapa aspas duplas duplicando-as", () => {
    expect(csvCell('Missão "especial"')).toBe('"Missão ""especial"""');
  });

  it("envolve em aspas quando contém quebra de linha", () => {
    expect(csvCell("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });
});

describe("csvRow", () => {
  it("junta células com vírgula, escapando cada uma", () => {
    expect(csvRow(["Métrica", "Valor, extra", 10, null])).toBe(
      'Métrica,"Valor, extra",10,',
    );
  });
});

describe("buildCsv", () => {
  it("prefixa BOM UTF-8 e junta linhas com CRLF", () => {
    const csv = buildCsv(["a,b", "1,2"]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toBe("﻿a,b\r\n1,2\r\n");
  });
});
