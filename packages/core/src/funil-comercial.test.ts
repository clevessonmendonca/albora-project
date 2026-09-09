import { describe, expect, it } from "vitest";
import { ESPINHA_COMERCIAL, funilComercial, maiorPerdaComercial } from "./funil-comercial";

describe("funilComercial", () => {
  it("monta os cinco degraus na ordem, mesmo com nomes ausentes em product_events", () => {
    const degraus = funilComercial({ account_created: 10 });
    expect(degraus.map((d) => d.etapa)).toEqual([...ESPINHA_COMERCIAL]);
    expect(degraus.map((d) => d.eventos)).toEqual([10, 0, 0, 0, 0]);
  });

  it("primeiro degrau não tem retenção — não há anterior para comparar", () => {
    expect(funilComercial({ account_created: 10 })[0]?.retencao).toBeNull();
  });

  it("retenção é fração do degrau anterior", () => {
    const degraus = funilComercial({ account_created: 100, event_created: 72 });
    expect(degraus[1]?.retencao).toBeCloseTo(0.72);
  });

  it("anterior zerado não vira divisão por zero — retenção é null, não Infinity", () => {
    const degraus = funilComercial({ account_created: 0, event_created: 5 });
    expect(degraus[1]?.retencao).toBeNull();
  });

  it("nome desconhecido em product_events é ignorado, não vira degrau", () => {
    const degraus = funilComercial({ account_created: 3, landing_view: 999 });
    expect(degraus).toHaveLength(ESPINHA_COMERCIAL.length);
    expect(degraus.some((d) => d.eventos === 999)).toBe(false);
  });

  it("contagem negativa ou fracionária não passa — dado sujo não vira barra", () => {
    const degraus = funilComercial({ account_created: -5, event_created: 3.7 });
    expect(degraus[0]?.eventos).toBe(0);
    expect(degraus[1]?.eventos).toBe(3);
  });
});

describe("maiorPerdaComercial", () => {
  it("aponta a maior queda absoluta, não a última etapa", () => {
    const perda = maiorPerdaComercial(
      funilComercial({
        account_created: 1240,
        event_created: 890,
        qr_downloaded: 812,
        checkout_started: 640,
        checkout_paid: 512,
      }),
    );
    expect(perda?.de).toBe("account_created");
    expect(perda?.para).toBe("event_created");
    expect(perda?.sessoesPerdidas).toBe(350);
  });

  it("funil sem perda nenhuma não inventa uma", () => {
    expect(maiorPerdaComercial(funilComercial({}))).toBeNull();
  });
});
