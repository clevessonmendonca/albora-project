import { describe, expect, it } from "vitest";
import { slugLegivelDeTitulo } from "./slug";

describe("slugLegivelDeTitulo", () => {
  it("transforma nome de evento em slug ditável", () => {
    expect(slugLegivelDeTitulo("Ana & João")).toBe("ana-e-joao");
  });

  it("tira acento e pontuação", () => {
    expect(slugLegivelDeTitulo("Aniversário da Cecília!")).toBe("aniversario-da-cecilia");
  });

  it("não deixa hífen sobrando nas pontas", () => {
    expect(slugLegivelDeTitulo("  — Formatura —  ")).toBe("formatura");
  });

  it("recusa nome sem base utilizável — o chamador cai no aleatório", () => {
    expect(slugLegivelDeTitulo("")).toBeNull();
    expect(slugLegivelDeTitulo(null)).toBeNull();
    expect(slugLegivelDeTitulo("🎉🎉")).toBeNull();
    expect(slugLegivelDeTitulo("Oi")).toBeNull();
  });

  it("recusa reservado: cada evento é um subdomínio (security.md §4.7)", () => {
    expect(slugLegivelDeTitulo("mídia")).toBeNull();
    expect(slugLegivelDeTitulo("Admin")).toBeNull();
    expect(slugLegivelDeTitulo("telão")).toBeNull();
  });

  it("trunca nome longo sem terminar em hífen", () => {
    const s = slugLegivelDeTitulo("Casa " + "muito ".repeat(20) + "grande");
    expect(s).not.toBeNull();
    expect(s!.length).toBeLessThanOrEqual(32);
    expect(s!.endsWith("-")).toBe(false);
  });
});
