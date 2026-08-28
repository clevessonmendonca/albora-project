import { describe, expect, it } from "vitest";
import { AJUSTES_NEUTROS, aplicarAjustes, saoNeutros, type AjustesManuais } from "./ajustes";

function ajuste(parcial: Partial<AjustesManuais>): AjustesManuais {
  return { ...AJUSTES_NEUTROS, ...parcial };
}

function uniforme(largura: number, altura: number, cinza: number, alfa = 255): Uint8ClampedArray {
  const dados = new Uint8ClampedArray(largura * altura * 4);

  for (let i = 0; i < largura * altura; i += 1) {
    dados[i * 4] = cinza;
    dados[i * 4 + 1] = cinza;
    dados[i * 4 + 2] = cinza;
    dados[i * 4 + 3] = alfa;
  }

  return dados;
}

function pixel(dados: Uint8ClampedArray, largura: number, x: number, y: number) {
  const p = (y * largura + x) * 4;
  return {
    r: dados[p] ?? 0,
    g: dados[p + 1] ?? 0,
    b: dados[p + 2] ?? 0,
    a: dados[p + 3] ?? 0,
  };
}

describe("neutro", () => {
  it("não toca em pixel nenhum", () => {
    const dados = new Uint8ClampedArray([
      0, 0, 0, 255,
      255, 255, 255, 255,
      17, 133, 201, 64,
      120, 120, 120, 255,
    ]);
    const antes = Array.from(dados);

    aplicarAjustes(dados, 2, 2, AJUSTES_NEUTROS);

    expect(Array.from(dados)).toEqual(antes);
    expect(saoNeutros(AJUSTES_NEUTROS)).toBe(true);
  });
});

describe("luz", () => {
  it("positiva clareia e negativa escurece o mesmo pixel", () => {
    const clara = uniforme(2, 2, 100);
    const escura = uniforme(2, 2, 100);

    aplicarAjustes(clara, 2, 2, ajuste({ luz: 1 }));
    aplicarAjustes(escura, 2, 2, ajuste({ luz: -1 }));

    expect(pixel(clara, 2, 0, 0).r).toBe(155);
    expect(pixel(escura, 2, 0, 0).r).toBe(45);
  });

  it("não lava o preto: é multiplicativa, e sombra continua sombra", () => {
    const dados = new Uint8ClampedArray([0, 0, 0, 255, 120, 120, 120, 255]);

    aplicarAjustes(dados, 2, 1, ajuste({ luz: 0.8 }));

    expect(pixel(dados, 2, 0, 0)).toMatchObject({ r: 0, g: 0, b: 0 });
    expect(pixel(dados, 2, 1, 0).r).toBeGreaterThan(120);
  });
});

describe("calor", () => {
  it("positivo sobe o vermelho, desce o azul e deixa o verde onde estava", () => {
    const dados = uniforme(2, 2, 100);

    aplicarAjustes(dados, 2, 2, ajuste({ calor: 1 }));

    expect(pixel(dados, 2, 0, 0)).toMatchObject({ r: 126, g: 100, b: 74 });
  });

  it("negativo puxa para o azul", () => {
    const dados = uniforme(2, 2, 100);

    aplicarAjustes(dados, 2, 2, ajuste({ calor: -1 }));

    expect(pixel(dados, 2, 0, 0)).toMatchObject({ r: 74, g: 100, b: 126 });
  });
});

describe("contraste", () => {
  it("afasta do meio: na mesma chamada o claro clareia e o escuro escurece", () => {
    const dados = new Uint8ClampedArray([200, 200, 200, 255, 50, 50, 50, 255]);

    aplicarAjustes(dados, 2, 1, ajuste({ contraste: 1 }));

    expect(pixel(dados, 2, 0, 0).r).toBe(243);
    expect(pixel(dados, 2, 1, 0).r).toBe(3);
  });

  it("negativo aproxima do meio", () => {
    const dados = new Uint8ClampedArray([200, 200, 200, 255, 50, 50, 50, 255]);

    aplicarAjustes(dados, 2, 1, ajuste({ contraste: -1 }));

    expect(pixel(dados, 2, 0, 0).r).toBeLessThan(200);
    expect(pixel(dados, 2, 1, 0).r).toBeGreaterThan(50);
  });
});

describe("vinheta", () => {
  it("escurece a borda e deixa o centro intacto", () => {
    const dados = uniforme(64, 64, 128);

    aplicarAjustes(dados, 64, 64, ajuste({ vinheta: 1 }));

    expect(pixel(dados, 64, 32, 32).r).toBe(128);
    expect(pixel(dados, 64, 0, 0).r).toBe(32);
  });

  it("fecha igual na foto em pé e na deitada", () => {
    // Três de cada quatro fotos de festa são verticais — se a normalização não fosse pela diagonal, a vinheta fecharia mais pelos lados que pelo topo, e o canto de uma 32×96 não bateria com o da mesma foto girada.
    const emPe = uniforme(32, 96, 128);
    const deitada = uniforme(96, 32, 128);

    aplicarAjustes(emPe, 32, 96, ajuste({ vinheta: 0.8 }));
    aplicarAjustes(deitada, 96, 32, ajuste({ vinheta: 0.8 }));

    expect(pixel(emPe, 32, 0, 0).r).toBe(51);
    expect(pixel(deitada, 96, 0, 0).r).toBe(51);

    const divergentes: string[] = [];
    for (let y = 0; y < 96; y += 1) {
      for (let x = 0; x < 32; x += 1) {
        if (pixel(emPe, 32, x, y).r !== pixel(deitada, 96, y, x).r) divergentes.push(`${x},${y}`);
      }
    }
    expect(divergentes).toEqual([]);
  });
});

describe("o que a passagem não pode quebrar", () => {
  it("o alfa passa intacto pelos quatro ajustes", () => {
    const dados = uniforme(16, 16, 130, 123);

    aplicarAjustes(dados, 16, 16, { luz: 0.7, calor: -0.5, contraste: 0.9, vinheta: 1 });

    const alfas = new Set<number>();
    for (let i = 3; i < dados.length; i += 4) alfas.add(dados[i] ?? -1);
    expect([...alfas]).toEqual([123]);
  });

  it("valor fora de faixa é limitado, não estoura", () => {
    const fora = uniforme(8, 8, 100);
    const limite = uniforme(8, 8, 100);

    aplicarAjustes(fora, 8, 8, { luz: 5, calor: 42, contraste: -9, vinheta: -3 });
    aplicarAjustes(limite, 8, 8, { luz: 1, calor: 1, contraste: -1, vinheta: 0 });

    expect(Array.from(fora)).toEqual(Array.from(limite));
    expect(Array.from(fora).every(Number.isFinite)).toBe(true);
  });
});

describe("a ordem dos quatro", () => {
  it("a luz corrige a exposição antes de o contraste amplificá-la", () => {
    // Contraste antes da luz devolveria 30 no lugar de 72: o erro de exposição sairia amplificado em vez de corrigido.
    const dados = uniforme(2, 2, 60);

    aplicarAjustes(dados, 2, 2, ajuste({ luz: 1, contraste: 1 }));

    expect(pixel(dados, 2, 0, 0).r).toBe(72);
  });
});
