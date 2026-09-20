import { describe, expect, it } from "vitest";
import { estadoDaRetencao } from "./retencao";

const DIA_MS = 24 * 60 * 60 * 1000;

function fimHa(dias: number): Date {
  return new Date(Date.UTC(2026, 8, 20) - dias * DIA_MS);
}

const AGORA = new Date(Date.UTC(2026, 8, 20));

describe("estadoDaRetencao", () => {
  it("fica discreto enquanto o prazo está longe", () => {
    const { dias, urgente } = estadoDaRetencao(fimHa(30), AGORA);
    expect(dias).toBe(335);
    expect(urgente).toBe(false);
  });

  it("vira aviso a 35 dias do apagamento", () => {
    expect(estadoDaRetencao(fimHa(330), AGORA).urgente).toBe(true);
    expect(estadoDaRetencao(fimHa(329), AGORA).urgente).toBe(false);
  });

  it("não deixa o prazo virar negativo depois de vencido", () => {
    const { dias, urgente } = estadoDaRetencao(fimHa(400), AGORA);
    expect(dias).toBe(0);
    expect(urgente).toBe(true);
  });
});
