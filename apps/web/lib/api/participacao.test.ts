import { describe, expect, it } from "vitest";
import { resumoDeParticipacao } from "./participacao";

describe("resumo de participação", () => {
  it("sem presença confirmada, usa a estimativa do anfitrião", () => {
    const r = resumoDeParticipacao({
      expectedGuests: 100,
      actualGuests: null,
      sessoesComUpload: 40,
    });

    expect(r.denominador).toBe(100);
    expect(r.origem).toBe("estimado");
    expect(r.taxa).toBeCloseTo(0.4);
    expect(r.codigo).toBe("funil.tese_validada");
  });

  it("com presença confirmada, a estimativa perde", () => {
    const r = resumoDeParticipacao({
      expectedGuests: 100,
      actualGuests: 50,
      sessoesComUpload: 40,
    });

    expect(r.denominador).toBe(50);
    expect(r.origem).toBe("confirmado");
    expect(r.taxa).toBeCloseTo(0.8);
  });

  it("o denominador errado pula duas faixas de veredito, e é por isso que isto importa", () => {
    const comEstimativa = resumoDeParticipacao({
      expectedGuests: 200,
      actualGuests: null,
      sessoesComUpload: 45,
    });
    const comPresenca = resumoDeParticipacao({
      expectedGuests: 200,
      actualGuests: 100,
      sessoesComUpload: 45,
    });

    expect(comEstimativa.codigo).toBe("funil.parar");
    expect(comPresenca.codigo).toBe("funil.tese_validada");
  });

  it("presença confirmada como zero não vale: cai na estimativa", () => {
    const r = resumoDeParticipacao({
      expectedGuests: 80,
      actualGuests: 0,
      sessoesComUpload: 20,
    });

    expect(r.denominador).toBe(80);
    expect(r.origem).toBe("estimado");
  });
});
