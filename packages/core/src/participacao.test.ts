import { describe, expect, it } from "vitest";
import { MetricaInvalida, taxaDeParticipacao, taxaDeParticipacaoOuNula } from "./funnel";

describe("taxaDeParticipacaoOuNula", () => {
  it("é a mesma conta de taxaDeParticipacao quando há denominador", () => {
    const contagem = { expectedGuests: 120, sessoesComUpload: 48 };
    expect(taxaDeParticipacaoOuNula(contagem)).toBe(taxaDeParticipacao(contagem));
  });

  it("sem denominador devolve null em vez de lançar — leitura de plataforma não pode cair por isso", () => {
    expect(taxaDeParticipacaoOuNula({ expectedGuests: 0, sessoesComUpload: 5 })).toBeNull();
    expect(() => taxaDeParticipacao({ expectedGuests: 0, sessoesComUpload: 5 })).toThrow(MetricaInvalida);
  });

  it("numerador inválido também é ausência de dado, nunca 0%", () => {
    expect(taxaDeParticipacaoOuNula({ expectedGuests: 10, sessoesComUpload: -1 })).toBeNull();
    expect(taxaDeParticipacaoOuNula({ expectedGuests: 10, sessoesComUpload: Number.NaN })).toBeNull();
  });
});
