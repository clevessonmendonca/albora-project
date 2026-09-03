import { describe, expect, it } from "vitest";
import {
  fullTarget,
  ladoMaiorParaRede,
  PIXEL_CAP,
  pixelCapForDevice,
  planProcessing,
  targetForLongerSide,
  targetThatFits,
  thumbTarget,
} from "./redimensionar";

const ratio = (a: { width: number; height: number }) => a.width / a.height;

describe("redução mantém proporção e nunca amplia", () => {
  it("reduz a foto de celular pelo lado maior", () => {
    const a = targetForLongerSide(4032, 3024, 2500);

    expect(Math.max(a.width, a.height)).toBe(2500);
    expect(ratio(a)).toBeCloseTo(4032 / 3024, 2);
  });

  it("funciona igual em retrato — que é o caso comum na festa", () => {
    const a = targetForLongerSide(3024, 4032, 2500);

    expect(a.height).toBe(2500);
    expect(ratio(a)).toBeCloseTo(3024 / 4032, 2);
  });

  it("não amplia foto já pequena", () => {
    // Ampliar não acrescenta informação: gasta banda do convidado e memória do aparelho para entregar a mesma imagem borrada.
    expect(targetForLongerSide(800, 600, 2500)).toEqual({ width: 800, height: 600 });
  });

  it("o plano decide o lado maior", () => {
    expect(Math.max(...Object.values(fullTarget(6000, 4000, "gratis")))).toBe(2500);
    expect(Math.max(...Object.values(fullTarget(6000, 4000, "pago")))).toBe(3500);
  });

  it("nunca devolve dimensão zero", () => {
    const a = targetForLongerSide(10_000, 3, 100);

    expect(a.width).toBeGreaterThan(0);
    expect(a.height).toBeGreaterThan(0);
  });
});

describe("teto de pixels — degradar, nunca falhar", () => {
  it("uma foto acima do teto é reduzida até caber", () => {
    const a = targetThatFits({ width: 4000, height: 3000 }, PIXEL_CAP.modest);

    expect(a.width * a.height).toBeLessThanOrEqual(PIXEL_CAP.modest);
    expect(ratio(a)).toBeCloseTo(4000 / 3000, 1);
  });

  it("abaixo do teto passa intacta", () => {
    const a = { width: 1000, height: 800 };
    expect(targetThatFits(a, PIXEL_CAP.standard)).toEqual(a);
  });

  it("aparelho de pouca memória ou poucos núcleos usa o teto modesto", () => {
    expect(pixelCapForDevice({ memoryGb: 2 })).toBe(PIXEL_CAP.modest);
    expect(pixelCapForDevice({ cores: 2 })).toBe(PIXEL_CAP.modest);
  });

  it("na dúvida assume o padrão", () => {
    // Tratar aparelho capaz como modesto entrega foto pior a todo mundo, e a maioria dos aparelhos numa festa é capaz.
    expect(pixelCapForDevice({})).toBe(PIXEL_CAP.standard);
    expect(pixelCapForDevice({ memoryGb: 8, cores: 8 })).toBe(PIXEL_CAP.standard);
  });
});

describe("teto por rede — o pacote de dados do convidado", () => {
  it("rede desconhecida não reduz nada", () => {
    expect(ladoMaiorParaRede("pago", {})).toBe(3500);
    expect(ladoMaiorParaRede("gratis", {})).toBe(2500);
  });

  it("saveData ligado reduz o pago ao teto do grátis", () => {
    expect(ladoMaiorParaRede("pago", { economiaDeDados: true })).toBe(2500);
  });

  it("2g reduz; 3g e 4g não", () => {
    expect(ladoMaiorParaRede("pago", { tipoEfetivo: "slow-2g" })).toBe(2500);
    expect(ladoMaiorParaRede("pago", { tipoEfetivo: "2g" })).toBe(2500);
    expect(ladoMaiorParaRede("pago", { tipoEfetivo: "3g" })).toBe(3500);
    expect(ladoMaiorParaRede("pago", { tipoEfetivo: "4g" })).toBe(3500);
  });

  it("nunca amplia o grátis, mesmo em rede boa", () => {
    expect(ladoMaiorParaRede("gratis", { tipoEfetivo: "4g" })).toBe(2500);
    expect(ladoMaiorParaRede("gratis", { economiaDeDados: true })).toBe(2500);
  });

  it("planProcessing aplica o teto de rede sem a foto deixar de sair", () => {
    const p = planProcessing({
      width: 4032,
      height: 3024,
      plan: "pago",
      device: { memoryGb: 8, cores: 8 },
      rede: { economiaDeDados: true },
    });

    expect(Math.max(p.full.width, p.full.height)).toBe(2500);
    expect(ratio(p.full)).toBeCloseTo(4032 / 3024, 2);
  });
});

describe("plano completo de processamento", () => {
  it("num aparelho comum, o plano manda", () => {
    const p = planProcessing({
      width: 4032,
      height: 3024,
      plan: "gratis",
      device: { memoryGb: 8, cores: 8 },
    });

    expect(Math.max(p.full.width, p.full.height)).toBe(2500);
    expect(Math.max(p.thumb.width, p.thumb.height)).toBe(320);
  });

  it("num aparelho modesto, o teto manda e a foto ainda sai", () => {
    const p = planProcessing({
      width: 4032,
      height: 3024,
      plan: "pago",
      device: { memoryGb: 2 },
    });

    expect(p.full.width * p.full.height).toBeLessThanOrEqual(PIXEL_CAP.modest);
    expect(p.full.width).toBeGreaterThan(0);
  });

  it("a miniatura sai do alvo reduzido, não do original", () => {
    // Reprocessar o original dobraria o pico de memória justamente no aparelho mais fraco.
    const p = planProcessing({
      width: 8000,
      height: 6000,
      plan: "gratis",
      device: { memoryGb: 2 },
    });

    expect(p.thumb).toEqual(thumbTarget(p.full.width, p.full.height));
    expect(Math.max(p.thumb.width, p.thumb.height)).toBe(320);
  });
});
