import { describe, expect, it } from "vitest";
import { proximoValorExibido } from "./animated-counter";

describe("proximoValorExibido só sobe", () => {
  it("aproxima em passos proporcionais à distância, nunca ultrapassa o alvo", () => {
    let atual = 0;
    const alvo = 847;
    let passos = 0;
    while (atual !== alvo) {
      const proximo = proximoValorExibido(atual, alvo);
      expect(proximo).toBeGreaterThan(atual);
      expect(proximo).toBeLessThanOrEqual(alvo);
      atual = proximo;
      passos += 1;
      expect(passos).toBeLessThan(200);
    }
    expect(atual).toBe(alvo);
  });

  it("passo mínimo de 1 mesmo perto do alvo", () => {
    expect(proximoValorExibido(846, 847)).toBe(847);
  });

  it("já no alvo, permanece", () => {
    expect(proximoValorExibido(847, 847)).toBe(847);
  });

  it("alvo caiu (ex.: moderação removeu foto) — salta direto, sem contar pra trás aos poucos", () => {
    expect(proximoValorExibido(847, 800)).toBe(800);
  });
});
