import { describe, expect, it } from "vitest";
import { aplicarPorPixel, ordenarComRecomendado, preset, PRESETS } from "./presets";

/** Índice cru de um typed array, sem o `| undefined` do tsconfig estrito. */
function px(dados: Uint8ClampedArray, i: number): number {
  return dados[i] ?? -1;
}

function imagem(cor: [number, number, number], largura = 8, altura = 8): Uint8ClampedArray {
  const dados = new Uint8ClampedArray(largura * altura * 4);
  for (let i = 0; i < largura * altura; i++) {
    dados[i * 4] = cor[0];
    dados[i * 4 + 1] = cor[1];
    dados[i * 4 + 2] = cor[2];
    dados[i * 4 + 3] = 255;
  }
  return dados;
}

describe("catálogo", () => {
  it("tem oito filtros com id único", () => {
    expect(PRESETS).toHaveLength(8);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(8);
  });

  it("só o 35 mm exige passagem por pixel", () => {
    expect(PRESETS.filter((p) => p.porPixel).map((p) => p.id)).toEqual(["35mm"]);
  });

  it("o 35 mm carrega uma degradação em CSS", () => {
    // A nuance de risco da 006: acima do teto de tempo, o preset cai para o
    // CSS. Sem `ajustes` preenchido, degradar significaria ficar sem filtro.
    expect(preset("35mm")?.ajustes.sepia).toBeGreaterThan(0);
  });
});

describe("recomendado", () => {
  it("vai para a primeira posição sem sumir do resto", () => {
    const ordenados = ordenarComRecomendado("dourado");

    expect(ordenados[0]?.id).toBe("dourado");
    expect(ordenados).toHaveLength(8);
    expect(new Set(ordenados.map((p) => p.id)).size).toBe(8);
  });

  it("sem recomendado, mantém a ordem do catálogo", () => {
    expect(ordenarComRecomendado(null).map((p) => p.id)).toEqual(PRESETS.map((p) => p.id));
  });

  it("recomendado que não existe não esvazia a tira", () => {
    // O id vem do banco, escrito pelo admin. Um preset removido do catálogo
    // não pode deixar o convidado sem filtro nenhum.
    expect(ordenarComRecomendado("filtro-que-nao-existe")).toHaveLength(8);
  });
});

describe("35 mm", () => {
  it("intensidade zero não toca em pixel nenhum", () => {
    const dados = imagem([120, 130, 140]);
    const antes = Uint8ClampedArray.from(dados);

    aplicarPorPixel(dados, 8, 8, 0);

    expect(dados).toEqual(antes);
  });

  it("levanta o preto — filme não tem preto absoluto", () => {
    const dados = imagem([0, 0, 0]);
    aplicarPorPixel(dados, 8, 8, 1);

    expect(px(dados, 0)).toBeGreaterThan(0);
  });

  it("comprime a alta em vez de cortar", () => {
    const dados = imagem([255, 255, 255]);
    aplicarPorPixel(dados, 8, 8, 1);

    // Continua sendo branco, não vira cinza: o ombro comprime a subida, mas
    // 1,0 continua mapeando em 1,0.
    expect(px(dados, 0)).toBeGreaterThan(250);
  });

  it("puxa o verde nos médios", () => {
    const dados = imagem([128, 128, 128]);
    aplicarPorPixel(dados, 8, 8, 1);

    expect(px(dados, 1)).toBeGreaterThan(px(dados, 2));
  });

  it("é determinístico — a mesma foto sai com o mesmo grão", () => {
    const a = imagem([90, 100, 110]);
    const b = imagem([90, 100, 110]);

    aplicarPorPixel(a, 8, 8, 1);
    aplicarPorPixel(b, 8, 8, 1);

    expect(a).toEqual(b);
  });

  it("aplica grão — pixels iguais deixam de ser iguais", () => {
    const dados = imagem([120, 120, 120], 16, 16);
    aplicarPorPixel(dados, 16, 16, 1);

    const vermelhos = new Set(Array.from({ length: 256 }, (_, i) => px(dados, i * 4)));
    expect(vermelhos.size).toBeGreaterThan(1);
  });

  it("intensidade parcial fica entre o original e o cheio", () => {
    const original = imagem([40, 40, 40]);
    const meio = imagem([40, 40, 40]);
    const cheio = imagem([40, 40, 40]);

    aplicarPorPixel(meio, 8, 8, 0.5);
    aplicarPorPixel(cheio, 8, 8, 1);

    expect(px(meio, 0)).toBeGreaterThan(px(original, 0));
    expect(px(meio, 0)).toBeLessThan(px(cheio, 0));
  });

  it("preserva o alfa", () => {
    const dados = imagem([10, 200, 30]);
    aplicarPorPixel(dados, 8, 8, 1);

    expect(px(dados, 3)).toBe(255);
  });

  it("a halação vaza luz para o vizinho escuro", () => {
    // Metade branca, metade preta. O pixel preto encostado na luz precisa
    // clarear — é isso que halação é.
    const largura = 32;
    const altura = 8;
    const dados = new Uint8ClampedArray(largura * altura * 4);

    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        const p = (y * largura + x) * 4;
        const claro = x < largura / 2;
        dados[p] = dados[p + 1] = dados[p + 2] = claro ? 255 : 0;
        dados[p + 3] = 255;
      }
    }

    const antesDaBorda = px(dados, (4 * largura + largura / 2) * 4);
    aplicarPorPixel(dados, largura, altura, 1);

    const bordaEscura = px(dados, (4 * largura + largura / 2) * 4);
    const longeDaLuz = px(dados, (4 * largura + largura - 1) * 4);

    expect(antesDaBorda).toBe(0);
    expect(bordaEscura).toBeGreaterThan(longeDaLuz);
  });
});
