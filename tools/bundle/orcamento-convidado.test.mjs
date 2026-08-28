import { describe, expect, it } from "vitest";
import {
  avaliar,
  comparar,
  extrairRotas,
  parseKb,
} from "./orcamento-convidado.mjs";

const SAIDA_EXEMPLO = `
Route (app)                                 Size  First Load JS
┌ ○ /                                      137 B         102 kB
├ ƒ /e/[slug]/cover                      1.23 kB         128 kB
└ ƒ /e/[slug]/photo                      4.56 kB         198 kB
`;

const ORCAMENTOS = {
  rotas: {
    "/e/[slug]/cover": { firstLoadKb: 150, descricao: "gate" },
    "/e/[slug]/photo": { firstLoadKb: 220, descricao: "câmera" },
  },
};

describe("parseKb", () => {
  it("converte kB", () => {
    expect(parseKb("128 kB")).toBe(128);
    expect(parseKb("198.5 kB")).toBe(198.5);
  });
});

describe("extrairRotas", () => {
  it("lê First Load JS das rotas do convidado", () => {
    const rotas = extrairRotas(SAIDA_EXEMPLO);
    expect(rotas.get("/e/[slug]/cover")).toBe(128);
    expect(rotas.get("/e/[slug]/photo")).toBe(198);
  });
});

describe("comparar", () => {
  it("marca rotas dentro e acima do limite", () => {
    const rotas = new Map([
      ["/e/[slug]/cover", 128],
      ["/e/[slug]/photo", 250],
    ]);
    const resultados = comparar(rotas, ORCAMENTOS);
    expect(resultados.find((r) => r.rota.endsWith("/cover")).dentro).toBe(true);
    expect(resultados.find((r) => r.rota.endsWith("/photo")).dentro).toBe(false);
  });

  it("sinaliza rota ausente na saída do build", () => {
    const resultados = comparar(new Map(), ORCAMENTOS);
    expect(resultados.every((r) => r.ausente)).toBe(true);
  });
});

describe("avaliar", () => {
  it("prefere stdout quando a tabela traz First Load JS por rota", () => {
    const { resultados } = avaliar({
      saida: SAIDA_EXEMPLO,
      orcamentos: ORCAMENTOS,
      reportOnly: true,
    });
    expect(resultados.find((r) => r.rota.endsWith("/cover")).medidoKb).toBe(128);
  });

  it("não reprova em report-only mesmo acima do limite", () => {
    const acima = SAIDA_EXEMPLO.replace("198 kB", "300 kB");
    const { reprova } = avaliar({
      saida: acima,
      orcamentos: ORCAMENTOS,
      reportOnly: true,
    });
    expect(reprova).toBe(false);
  });

  it("reprova em modo estrito quando acima do limite", () => {
    const acima = SAIDA_EXEMPLO.replace("198 kB", "300 kB");
    const { reprova } = avaliar({
      saida: acima,
      orcamentos: ORCAMENTOS,
      reportOnly: false,
    });
    expect(reprova).toBe(true);
  });
});
