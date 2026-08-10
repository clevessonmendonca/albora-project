import { describe, expect, it } from "vitest";
import {
  alvoFull,
  alvoParaLadoMaior,
  alvoQueCabe,
  alvoThumb,
  planejarProcessamento,
  TETO_PIXELS,
  tetoParaAparelho,
} from "./redimensionar";

const proporcao = (a: { largura: number; altura: number }) => a.largura / a.altura;

describe("redução mantém proporção e nunca amplia", () => {
  it("reduz a foto de celular pelo lado maior", () => {
    const a = alvoParaLadoMaior(4032, 3024, 2500);

    expect(Math.max(a.largura, a.altura)).toBe(2500);
    expect(proporcao(a)).toBeCloseTo(4032 / 3024, 2);
  });

  it("funciona igual em retrato — que é o caso comum na festa", () => {
    const a = alvoParaLadoMaior(3024, 4032, 2500);

    expect(a.altura).toBe(2500);
    expect(proporcao(a)).toBeCloseTo(3024 / 4032, 2);
  });

  it("não amplia foto já pequena", () => {
    // Ampliar não acrescenta informação: gasta banda do convidado e memória
    // do aparelho para entregar a mesma imagem borrada.
    expect(alvoParaLadoMaior(800, 600, 2500)).toEqual({ largura: 800, altura: 600 });
  });

  it("o plano decide o lado maior", () => {
    expect(Math.max(...Object.values(alvoFull(6000, 4000, "gratis")))).toBe(2500);
    expect(Math.max(...Object.values(alvoFull(6000, 4000, "pago")))).toBe(3500);
  });

  it("nunca devolve dimensão zero", () => {
    const a = alvoParaLadoMaior(10_000, 3, 100);

    expect(a.largura).toBeGreaterThan(0);
    expect(a.altura).toBeGreaterThan(0);
  });
});

describe("teto de pixels — degradar, nunca falhar", () => {
  it("uma foto acima do teto é reduzida até caber", () => {
    const a = alvoQueCabe({ largura: 4000, altura: 3000 }, TETO_PIXELS.modesto);

    expect(a.largura * a.altura).toBeLessThanOrEqual(TETO_PIXELS.modesto);
    expect(proporcao(a)).toBeCloseTo(4000 / 3000, 1);
  });

  it("abaixo do teto passa intacta", () => {
    const a = { largura: 1000, altura: 800 };
    expect(alvoQueCabe(a, TETO_PIXELS.padrao)).toEqual(a);
  });

  it("aparelho de pouca memória ou poucos núcleos usa o teto modesto", () => {
    expect(tetoParaAparelho({ memoriaGb: 2 })).toBe(TETO_PIXELS.modesto);
    expect(tetoParaAparelho({ nucleos: 2 })).toBe(TETO_PIXELS.modesto);
  });

  it("na dúvida assume o padrão", () => {
    // Tratar aparelho capaz como modesto entrega foto pior a todo mundo, e a
    // maioria dos aparelhos numa festa é capaz.
    expect(tetoParaAparelho({})).toBe(TETO_PIXELS.padrao);
    expect(tetoParaAparelho({ memoriaGb: 8, nucleos: 8 })).toBe(TETO_PIXELS.padrao);
  });
});

describe("plano completo de processamento", () => {
  it("num aparelho comum, o plano manda", () => {
    const p = planejarProcessamento({
      largura: 4032,
      altura: 3024,
      plano: "gratis",
      aparelho: { memoriaGb: 8, nucleos: 8 },
    });

    expect(Math.max(p.full.largura, p.full.altura)).toBe(2500);
    expect(Math.max(p.thumb.largura, p.thumb.altura)).toBe(320);
  });

  it("num aparelho modesto, o teto manda e a foto ainda sai", () => {
    const p = planejarProcessamento({
      largura: 4032,
      altura: 3024,
      plano: "pago",
      aparelho: { memoriaGb: 2 },
    });

    expect(p.full.largura * p.full.altura).toBeLessThanOrEqual(TETO_PIXELS.modesto);
    expect(p.full.largura).toBeGreaterThan(0);
  });

  it("a miniatura sai do alvo reduzido, não do original", () => {
    // Reprocessar o original dobraria o pico de memória justamente no
    // aparelho mais fraco.
    const p = planejarProcessamento({
      largura: 8000,
      altura: 6000,
      plano: "gratis",
      aparelho: { memoriaGb: 2 },
    });

    expect(p.thumb).toEqual(alvoThumb(p.full.largura, p.full.altura));
    expect(Math.max(p.thumb.largura, p.thumb.altura)).toBe(320);
  });
});
