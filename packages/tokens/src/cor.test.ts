import { describe, expect, it } from "vitest";
import {
  lerHex,
  paraHex,
  luminancia,
  contraste,
  misturarHex,
  textoSobre,
  acentoLegivelSobre,
} from "./cor";

describe("lerHex", () => {
  it("lê hex de 6 dígitos", () => {
    expect(lerHex("#FF8000")).toEqual({ r: 255, g: 128, b: 0 });
  });

  it("lê hex sem #", () => {
    expect(lerHex("ff8000")).toEqual({ r: 255, g: 128, b: 0 });
  });

  it("expande hex de 3 dígitos", () => {
    expect(lerHex("#F80")).toEqual({ r: 255, g: 136, b: 0 });
  });

  it("aceita com espaço ao redor", () => {
    expect(lerHex("  #FF0000  ")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("retorna null para hex inválido", () => {
    expect(lerHex("xyz")).toBeNull();
    expect(lerHex("#GG0000")).toBeNull();
    expect(lerHex("")).toBeNull();
  });

  it("retorna null para hex com comprimento errado", () => {
    expect(lerHex("#FF00")).toBeNull();
    expect(lerHex("#FF000000")).toBeNull();
  });
});

describe("paraHex", () => {
  it("converte RGB para hex maiúsculo com #", () => {
    expect(paraHex({ r: 255, g: 128, b: 0 })).toBe("#FF8000");
  });

  it("clamp valores fora de 0-255", () => {
    expect(paraHex({ r: -10, g: 300, b: 128 })).toBe("#00FF80");
  });

  it("arredonda valores fracionários", () => {
    expect(paraHex({ r: 127.6, g: 0.4, b: 255 })).toBe("#8000FF");
  });

  it("preto", () => {
    expect(paraHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
  });

  it("branco", () => {
    expect(paraHex({ r: 255, g: 255, b: 255 })).toBe("#FFFFFF");
  });
});

describe("luminancia", () => {
  it("preto tem luminância 0", () => {
    expect(luminancia({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
  });

  it("branco tem luminância 1", () => {
    expect(luminancia({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });

  it("verde puro pesa mais que vermelho", () => {
    const verde = luminancia({ r: 0, g: 255, b: 0 });
    const vermelho = luminancia({ r: 255, g: 0, b: 0 });
    expect(verde).toBeGreaterThan(vermelho);
  });
});

describe("contraste", () => {
  it("preto contra branco é 21:1", () => {
    const c = contraste({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    expect(c).toBeCloseTo(21, 0);
  });

  it("mesma cor é 1:1", () => {
    const cor = { r: 128, g: 128, b: 128 };
    expect(contraste(cor, cor)).toBeCloseTo(1, 5);
  });

  it("é simétrico", () => {
    const a = { r: 255, g: 0, b: 0 };
    const b = { r: 0, g: 0, b: 255 };
    expect(contraste(a, b)).toBe(contraste(b, a));
  });
});

describe("misturarHex", () => {
  it("t=0 retorna base", () => {
    expect(misturarHex("#FF0000", "#0000FF", 0)).toBe("#FF0000");
  });

  it("t=1 retorna tom", () => {
    expect(misturarHex("#FF0000", "#0000FF", 1)).toBe("#0000FF");
  });

  it("t=0.5 retorna ponto médio", () => {
    expect(misturarHex("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });

  it("hex inválido retorna base", () => {
    expect(misturarHex("#FF0000", "invalido", 0.5)).toBe("#FF0000");
  });
});

describe("textoSobre", () => {
  it("escolhe candidato com melhor contraste", () => {
    const resultado = textoSobre("#FFFFFF", "#000000", "#CCCCCC");
    const rgb = lerHex(resultado);
    expect(rgb).not.toBeNull();
  });

  it("retorna primeiro candidato quando hex inválido", () => {
    expect(textoSobre("invalido", "#000000")).toBe("#000000");
  });
});

describe("acentoLegivelSobre", () => {
  it("retorna acento inalterado quando já tem contraste suficiente", () => {
    const resultado = acentoLegivelSobre("#000000", "#FFFFFF");
    expect(resultado).toBe("#000000");
  });

  it("ajusta acento quando contraste insuficiente", () => {
    const resultado = acentoLegivelSobre("#777777", "#787878");
    const rgb = lerHex(resultado);
    expect(rgb).not.toBeNull();
    expect(resultado).not.toBe("#777777");
  });

  it("funciona com múltiplas superfícies", () => {
    const resultado = acentoLegivelSobre("#808080", "#888888", "#999999");
    const rgb = lerHex(resultado);
    expect(rgb).not.toBeNull();
  });

  it("retorna acento original quando superfície inválida", () => {
    expect(acentoLegivelSobre("#FF0000", "invalido")).toBe("#FF0000");
  });
});
